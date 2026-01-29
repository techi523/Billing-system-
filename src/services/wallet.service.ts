import { Wallet, WalletTransaction, PlatformWallet, PlatformFee, Tenant, Payment, Settlement, TieredFee, PlatformTransaction, SMSLog, AuditLog } from '../models';
import { sequelize } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';
import { AuditService } from './audit.service';

export class WalletService {
    /**
     * Initialize tenant wallet on creation
     */
    static async initializeTenantWallet(tenantId: string): Promise<Wallet> {
        const transaction = await sequelize.transaction();

        try {
            // Create tenant wallet
            const wallet = await Wallet.create({
                ownerId: tenantId,
                ownerType: 'TENANT',
                balance: 0,
                frozenBalance: 0,
                pendingBalance: 0,
                settledBalance: 0,
                currency: 'KES',
                tenantId: tenantId
            }, { transaction });

            // Create initial wallet transaction
            await WalletTransaction.create({
                walletId: wallet.id,
                amount: 0,
                transactionType: 'CREDIT',
                referenceId: undefined,
                referenceType: 'INITIALIZATION',
                balanceAfter: 0,
                description: 'Wallet initialized',
                status: 'COMPLETED',
                createdBy: null,
                metadata: JSON.stringify({ action: 'wallet_initialization' }),
                tenantId: tenantId
            }, { transaction });

            await transaction.commit();

            await AuditService.log('WALLET_INITIALIZED', `Tenant wallet initialized: ${tenantId}`, tenantId, undefined);

            return wallet;
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to initialize tenant wallet', { error: error instanceof Error ? error.message : String(error), tenantId });
            throw new Error('Failed to initialize wallet');
        }
    }

    /**
     * Get wallet balance and analytics by owner
     */
    static async getWalletBalanceByOwner(ownerId: string, ownerType: 'TENANT' | 'SUBSCRIBER' | 'AGENT' = 'TENANT'): Promise<{
        balance: number;
        pending: number;
        settled: number;
        frozen: number;
        id: string;
        totalEarnings: number;
        totalFees: number;
    }> {
        const wallet = await Wallet.findOne({ where: { ownerId, ownerType } });

        // If wallet doesn't exist, return default values (for new tenants)
        if (!wallet) {
            return {
                balance: 0,
                pending: 0,
                settled: 0,
                frozen: 0,
                id: 'uninitialized',
                totalEarnings: 0,
                totalFees: 0
            };
        }

        // Calculate analytics (Total Earnings and Fees)
        const stats = await WalletTransaction.findAll({
            where: { walletId: wallet.id, transactionType: 'CREDIT' },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalEarnings']
            ],
            raw: true
        });

        // For platform fees, we look at payments linked to this wallet's transactions
        const payments = await Payment.findAll({
            where: { tenantId: ownerId, status: 'SUCCESS' },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('platformFee')), 'totalFees']
            ],
            raw: true
        });

        const totalEarnings = Number((stats[0] as any)?.totalEarnings || 0);
        const totalFees = Number((payments[0] as any)?.totalFees || 0);

        return {
            balance: Number(wallet.balance),
            pending: Number(wallet.pendingBalance),
            settled: Number(wallet.settledBalance),
            frozen: Number(wallet.frozenBalance),
            id: wallet.id,
            totalEarnings,
            totalFees
        };
    }

    /**
     * Get wallet balance by wallet ID
     */
    static async getWalletBalance(walletId: string): Promise<{ balance: number; pending: number; settled: number; frozen: number }> {
        const wallet = await Wallet.findByPk(walletId);
        if (!wallet) throw new Error('Wallet not found');

        return {
            balance: Number(wallet.balance),
            pending: Number(wallet.pendingBalance),
            settled: Number(wallet.settledBalance),
            frozen: Number(wallet.frozenBalance)
        };
    }

    /**
     * Process payment with automated split logic (90/10 or tenant-specific)
     */
    static async processPayment(payment: Payment): Promise<WalletTransaction> {
        const transaction = await sequelize.transaction();

        try {
            const tenant = await Tenant.findByPk(payment.tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const transactionAmount = payment.amount;
            const commissionPercentage = tenant.commissionPercentage || 10;
            const commissionAmount = (transactionAmount * commissionPercentage) / 100;
            const transactionFee = tenant.transactionFee || 0;
            const platformFeeAmount = commissionAmount + transactionFee;
            const netAmount = transactionAmount - platformFeeAmount;

            // Get tenant wallet
            const wallet = await Wallet.findOne({ where: { ownerId: payment.tenantId, ownerType: 'TENANT' } });
            if (!wallet) throw new Error('Tenant wallet not found');

            // Credit Tenant Wallet
            // Note: With Aggregator Model, funds are often settled instantly or follow a maturation period
            const newBalance = Number(wallet.balance) + netAmount;
            const newSettledBalance = Number(wallet.settledBalance) + netAmount; // Instant settlement for aggregator confirm

            await wallet.update({
                balance: newBalance,
                settledBalance: newSettledBalance
            }, { transaction });

            // Create wallet transaction
            const walletTransaction = await WalletTransaction.create({
                walletId: wallet.id,
                sourceWalletId: undefined,
                destinationWalletId: wallet.id,
                amount: netAmount,
                transactionType: 'CREDIT',
                referenceId: payment.id,
                referenceType: 'PAYMENT',
                balanceAfter: newBalance,
                description: `Payment received (Aggregator Split: ${100 - commissionPercentage}%)`,
                status: 'COMPLETED',
                settlementStatus: 'SETTLED',
                maturesAt: new Date(),
                createdBy: payment.subscriberId || undefined,
                metadata: JSON.stringify({
                    paymentId: payment.id,
                    totalAmount: transactionAmount,
                    commissionPercent: commissionPercentage,
                    platformCommission: platformFeeAmount,
                    tenantProceeds: netAmount
                }),
                tenantId: payment.tenantId
            }, { transaction });

            // Update payment with split details
            await payment.update({
                platformFee: platformFeeAmount,
                netAmount: netAmount,
                walletTransactionId: walletTransaction.id,
                status: 'SUCCESS',
                completedAt: new Date()
            }, { transaction });

            // Update platform wallet
            await this.updatePlatformWallet(platformFeeAmount, 'CREDIT', payment.id, transaction);

            // Record Platform Transactions for transparency
            if (commissionAmount > 0) {
                await PlatformTransaction.create({
                    type: 'COMMISSION',
                    amount: commissionAmount,
                    tenantId: payment.tenantId,
                    referenceId: payment.id,
                    metadata: JSON.stringify({ rate: commissionPercentage })
                }, { transaction });
            }

            if (transactionFee > 0) {
                await PlatformTransaction.create({
                    type: 'FEE_TRANSACTION',
                    amount: transactionFee,
                    tenantId: payment.tenantId,
                    referenceId: payment.id
                }, { transaction });
            }

            await transaction.commit();

            await AuditService.log('PAYMENT_AGGREGATOR_SPLIT', `Split processed for ${payment.id}: Tenant(${netAmount}) Platform(${platformFeeAmount})`, payment.tenantId, payment.subscriberId || undefined);

            return walletTransaction;
        } catch (error) {
            await transaction.rollback();
            logger.error('Aggregator split processing failed', { error: error instanceof Error ? error.message : String(error), paymentId: payment.id });
            throw new Error('Split processing failed');
        }
    }

    /**
     * Clear all matured pending balances for all wallets
     */
    static async clearAllMaturedPendingBalances(): Promise<number> {
        const { Op } = require('sequelize');
        const maturedTransactions = await WalletTransaction.findAll({
            where: {
                settlementStatus: 'PENDING',
                maturesAt: { [Op.lte]: new Date() }
            }
        });

        let clearedCount = 0;
        for (const tx of maturedTransactions) {
            try {
                await this.clearPendingBalance(tx.walletId, Number(tx.amount));
                await tx.update({ settlementStatus: 'SETTLED' });
                clearedCount++;
            } catch (error) {
                logger.error('Failed to clear matured pending balance', { transactionId: tx.id, error: error instanceof Error ? error.message : String(error) });
            }
        }

        if (clearedCount > 0) {
            logger.info(`Cleared ${clearedCount} matured pending transactions`);
        }

        return clearedCount;
    }

    /**
     * Clear pending balance to settled
     */
    static async clearPendingBalance(walletId: string, amount: number): Promise<Wallet> {
        const transaction = await sequelize.transaction();
        try {
            const wallet = await Wallet.findByPk(walletId);
            if (!wallet) throw new Error('Wallet not found');

            if (Number(wallet.pendingBalance) < amount) throw new Error('Insufficient pending balance');

            await wallet.update({
                pendingBalance: Number(wallet.pendingBalance) - amount,
                settledBalance: Number(wallet.settledBalance) + amount
            }, { transaction });

            await transaction.commit();
            return wallet;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update platform wallet
     */
    static async updatePlatformWallet(amount: number, transactionType: 'CREDIT' | 'DEBIT', referenceId: string | null, transaction?: any): Promise<PlatformWallet> {
        let platformWallet = await PlatformWallet.findOne();
        if (!platformWallet) {
            platformWallet = await PlatformWallet.create({ balance: 0, pendingBalance: 0, currency: 'KES' }, { transaction });
        }

        if (transactionType === 'CREDIT') {
            await platformWallet.update({
                balance: Number(platformWallet.balance) + amount,
                pendingBalance: Number(platformWallet.pendingBalance) + amount
            }, { transaction });
        } else {
            await platformWallet.update({
                balance: Number(platformWallet.balance) - amount,
                pendingBalance: Number(platformWallet.pendingBalance) - amount
            }, { transaction });
        }

        return platformWallet;
    }

    /**
     * Create settlement request
     */
    static async createSettlement(tenantId: string, amount: number, method: string, userId: string): Promise<Settlement> {
        const transaction = await sequelize.transaction();

        try {
            // Get tenant wallet
            const wallet = await Wallet.findOne({ where: { ownerId: tenantId, ownerType: 'TENANT' } });
            if (!wallet) throw new Error('Tenant wallet not found');

            // Check available balance
            if (wallet.balance < amount) throw new Error('Insufficient balance');

            // Get tenant details
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant) throw new Error('Tenant not found');

            // Check minimum withdrawal
            if (amount < tenant.minimumWithdrawalAmount) {
                throw new Error(`Minimum withdrawal amount is ${tenant.minimumWithdrawalAmount}`);
            }

            // Freeze the amount
            // Withdrawal happens from settledBalance
            if (Number(wallet.settledBalance) < amount) throw new Error('Insufficient settled balance for withdrawal');

            await wallet.update({
                settledBalance: Number(wallet.settledBalance) - amount,
                frozenBalance: Number(wallet.frozenBalance) + amount,
                balance: Number(wallet.balance) - amount
            }, { transaction });

            // Create settlement record
            const settlement = await Settlement.create({
                tenantId: tenantId,
                amount: amount,
                status: 'PENDING',
                method: method,
                paidAt: undefined,
                referenceNumber: undefined,
                transactionFee: 0,
                walletTransactionId: undefined,
                processedBy: userId
            }, { transaction });

            // Create wallet transaction
            const walletTransaction = await WalletTransaction.create({
                walletId: wallet.id,
                sourceWalletId: wallet.id,
                destinationWalletId: undefined, // External destination (e.g. M-Pesa B2C)
                amount: amount,
                transactionType: 'SETTLEMENT',
                referenceId: settlement.id,
                referenceType: 'SETTLEMENT',
                balanceAfter: Number(wallet.balance) - amount,
                description: `Settlement request via ${method}`,
                status: 'PENDING',
                createdBy: userId,
                metadata: JSON.stringify({
                    settlementId: settlement.id,
                    method: method,
                    status: 'PENDING'
                }),
                tenantId: tenantId
            }, { transaction });

            // Update settlement with wallet transaction
            await settlement.update({ walletTransactionId: walletTransaction.id }, { transaction });

            await transaction.commit();

            await AuditService.log('SETTLEMENT_REQUESTED', `Settlement requested: ${amount} via ${method}`, tenantId, userId || undefined);

            return settlement;
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to create settlement', { error: error instanceof Error ? error.message : String(error), tenantId, amount });
            throw new Error(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Process settlement (approve and pay out)
     */
    static async processSettlement(settlementId: string, userId: string): Promise<Settlement> {
        const transaction = await sequelize.transaction();

        try {
            const settlement = await Settlement.findByPk(settlementId, { transaction });
            if (!settlement) throw new Error('Settlement not found');

            if (settlement.status !== 'PENDING') throw new Error('Settlement already processed');

            const tenant = await Tenant.findByPk(settlement.tenantId);
            if (!tenant) throw new Error('Tenant not found');

            const wallet = await Wallet.findOne({ where: { ownerId: settlement.tenantId, ownerType: 'TENANT' } });
            if (!wallet) throw new Error('Tenant wallet not found');

            // Simulate payment processing (in real system, this would call payment gateway)
            const referenceNumber = `SETTLE-${Date.now()}`;

            // Update wallet - move from frozen to settled
            await wallet.update({
                frozenBalance: wallet.frozenBalance - settlement.amount,
                settledBalance: wallet.settledBalance + settlement.amount
            }, { transaction });

            // Update settlement
            await settlement.update({
                status: 'PAID',
                paidAt: new Date(),
                referenceNumber: referenceNumber,
                processedBy: userId
            }, { transaction });

            // Update wallet transaction
            const walletTransaction = await WalletTransaction.findByPk(settlement.walletTransactionId || undefined);
            if (walletTransaction) {
                await walletTransaction.update({
                    status: 'COMPLETED',
                    metadata: JSON.stringify({
                        ...JSON.parse(walletTransaction.metadata || '{}'),
                        status: 'PAID',
                        referenceNumber: referenceNumber,
                        paidAt: new Date().toISOString()
                    })
                }, { transaction });
            }

            await transaction.commit();

            await AuditService.log('SETTLEMENT_PROCESSED', `Settlement ${settlementId} processed: ${settlement.amount} paid via ${settlement.method}`, settlement.tenantId, userId || undefined);

            return settlement;
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to process settlement', { error: error instanceof Error ? error.message : String(error), settlementId });
            throw new Error(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Reverse a transaction
     */
    static async reverseTransaction(transactionId: string, reason: string, userId: string): Promise<WalletTransaction> {
        const transaction = await sequelize.transaction();

        try {
            const walletTransaction = await WalletTransaction.findByPk(transactionId, { transaction });
            if (!walletTransaction) throw new Error('Transaction not found');

            if (walletTransaction.status === 'REVERSED') throw new Error('Transaction already reversed');

            const wallet = await Wallet.findByPk(walletTransaction.walletId, { transaction });
            if (!wallet) throw new Error('Wallet not found');

            // Reverse the transaction
            let newBalance = wallet.balance;
            let newPendingBalance = wallet.pendingBalance;
            let newSettledBalance = wallet.settledBalance;
            let newFrozenBalance = wallet.frozenBalance;

            if (walletTransaction.transactionType === 'CREDIT') {
                // Reverse credit (debit the wallet)
                newBalance -= walletTransaction.amount;
                if (walletTransaction.referenceType === 'PAYMENT') {
                    newPendingBalance -= walletTransaction.amount;
                } else if (walletTransaction.referenceType === 'SETTLEMENT') {
                    newFrozenBalance -= walletTransaction.amount;
                }
            } else if (walletTransaction.transactionType === 'DEBIT' || walletTransaction.transactionType === 'FEE') {
                // Reverse debit (credit the wallet)
                newBalance += walletTransaction.amount;
                if (walletTransaction.referenceType === 'SETTLEMENT') {
                    newSettledBalance -= walletTransaction.amount;
                    newPendingBalance += walletTransaction.amount;
                }
            }

            await wallet.update({
                balance: newBalance,
                pendingBalance: newPendingBalance,
                settledBalance: newSettledBalance,
                frozenBalance: newFrozenBalance
            }, { transaction });

            // Mark original transaction as reversed
            await walletTransaction.update({
                status: 'REVERSED'
            }, { transaction });

            // Create reversal transaction
            const reversalTransaction = await WalletTransaction.create({
                walletId: wallet.id,
                amount: walletTransaction.amount,
                transactionType: 'REVERSAL',
                referenceId: walletTransaction.id,
                referenceType: 'REVERSAL',
                balanceAfter: newBalance,
                description: `Reversal of transaction ${walletTransaction.id}: ${reason}`,
                status: 'COMPLETED',
                createdBy: userId,
                metadata: JSON.stringify({
                    originalTransactionId: walletTransaction.id,
                    originalAmount: walletTransaction.amount,
                    originalType: walletTransaction.transactionType,
                    reason: reason
                }),
                tenantId: walletTransaction.tenantId
            }, { transaction });

            // If this was a payment, update the payment status
            if (walletTransaction.referenceType === 'PAYMENT') {
                const payment = await Payment.findByPk(walletTransaction.referenceId || undefined);
                if (payment) {
                    await payment.update({
                        status: 'REVERSED'
                    }, { transaction });
                }
            }

            // If this was a settlement, update the settlement status
            if (walletTransaction.referenceType === 'SETTLEMENT') {
                const settlement = await Settlement.findByPk(walletTransaction.referenceId || undefined);
                if (settlement) {
                    await settlement.update({
                        status: 'REVERSED'
                    }, { transaction });
                }
            }

            await transaction.commit();

            await AuditService.log('TRANSACTION_REVERSED', `Transaction ${transactionId} reversed: ${reason}`, walletTransaction.tenantId, userId || undefined);

            return reversalTransaction;
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to reverse transaction', { error: error instanceof Error ? error.message : String(error), transactionId });
            throw new Error(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Get wallet transactions by owner
     */
    static async getWalletTransactionsByOwner(ownerId: string, ownerType: 'TENANT' | 'SUBSCRIBER' | 'AGENT' = 'TENANT', limit: number = 50, offset: number = 0): Promise<WalletTransaction[]> {
        const wallet = await Wallet.findOne({ where: { ownerId, ownerType } });
        if (!wallet) return [];

        return WalletTransaction.findAll({
            where: { walletId: wallet.id },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
    }

    /**
     * Get wallet transactions
     */
    static async getWalletTransactions(walletId: string, limit: number = 50, offset: number = 0): Promise<WalletTransaction[]> {
        return WalletTransaction.findAll({
            where: { walletId },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
    }

    /**
     * Get wallet statement
     */
    static async getWalletStatement(walletId: string, startDate: Date, endDate: Date): Promise<WalletTransaction[]> {
        return WalletTransaction.findAll({
            where: {
                walletId,
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate
                }
            },
            order: [['createdAt', 'DESC']]
        });
    }

    /**
     * Manual wallet adjustment (for corrections)
     */
    static async manualAdjustment(walletId: string, amount: number, reason: string, userId: string): Promise<WalletTransaction> {
        const transaction = await sequelize.transaction();

        try {
            const wallet = await Wallet.findByPk(walletId, { transaction });
            if (!wallet) throw new Error('Wallet not found');

            const newBalance = wallet.balance + amount;

            await wallet.update({
                balance: newBalance
            }, { transaction });

            const walletTransaction = await WalletTransaction.create({
                walletId: wallet.id,
                amount: amount,
                transactionType: amount > 0 ? 'CREDIT' : 'DEBIT',
                referenceId: undefined,
                referenceType: 'ADJUSTMENT',
                balanceAfter: newBalance,
                description: `Manual adjustment: ${reason}`,
                status: 'COMPLETED',
                createdBy: userId,
                metadata: JSON.stringify({
                    adjustmentType: amount > 0 ? 'credit' : 'debit',
                    reason: reason,
                    adjustedBy: userId
                }),
                tenantId: wallet.tenantId
            }, { transaction });

            await transaction.commit();

            await AuditService.log('WALLET_ADJUSTMENT', `Manual adjustment: ${amount} - ${reason}`, wallet.tenantId, userId || undefined);

            return walletTransaction;
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to make manual adjustment', { error: error instanceof Error ? error.message : String(error), walletId });
            throw new Error(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Bill for SMS usage
     */
    static async billSms(tenantId: string, smsLogId: string): Promise<void> {
        const transaction = await sequelize.transaction();
        try {
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant || !tenant.smsFee) {
                await transaction.commit();
                return;
            }

            const fee = tenant.smsFee;
            const wallet = await Wallet.findOne({ where: { ownerId: tenantId, ownerType: 'TENANT' } });
            if (!wallet) throw new Error('Tenant wallet not found');

            // Deduct from wallet
            await wallet.update({
                balance: Number(wallet.balance) - fee,
                settledBalance: Number(wallet.settledBalance) - fee
            }, { transaction });

            // Create wallet transaction
            await WalletTransaction.create({
                walletId: wallet.id,
                amount: fee,
                transactionType: 'FEE',
                referenceId: smsLogId,
                referenceType: 'SMS',
                balanceAfter: Number(wallet.balance) - fee,
                description: `SMS notification fee`,
                status: 'COMPLETED',
                tenantId: tenantId
            }, { transaction });

            // Update platform wallet
            await this.updatePlatformWallet(fee, 'CREDIT', smsLogId, transaction);

            // Record Platform Transaction
            await PlatformTransaction.create({
                type: 'FEE_SMS',
                amount: fee,
                tenantId: tenantId,
                referenceId: smsLogId
            }, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to bill SMS usage', { error: error instanceof Error ? error.message : String(error), tenantId });
        }
    }

    /**
     * Bill for base subscription
     */
    static async billSubscription(tenantId: string): Promise<void> {
        const transaction = await sequelize.transaction();
        try {
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant || !tenant.baseMonthlyFee) {
                await transaction.commit();
                return;
            }

            const fee = tenant.baseMonthlyFee;
            const wallet = await Wallet.findOne({ where: { ownerId: tenantId, ownerType: 'TENANT' } });
            if (!wallet) throw new Error('Tenant wallet not found');

            // Deduct from wallet
            await wallet.update({
                balance: Number(wallet.balance) - fee,
                settledBalance: Number(wallet.settledBalance) - fee
            }, { transaction });

            // Create wallet transaction
            await WalletTransaction.create({
                walletId: wallet.id,
                amount: fee,
                transactionType: 'FEE',
                referenceType: 'SUBSCRIPTION',
                balanceAfter: Number(wallet.balance) - fee,
                description: `Monthly platform subscription fee`,
                status: 'COMPLETED',
                tenantId: tenantId
            }, { transaction });

            // Update platform wallet
            await this.updatePlatformWallet(fee, 'CREDIT', null, transaction);

            // Record Platform Transaction
            await PlatformTransaction.create({
                type: 'FEE_SUBSCRIPTION',
                amount: fee,
                tenantId: tenantId
            }, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to bill subscription', { error: error instanceof Error ? error.message : String(error), tenantId });
        }
    }

    /**
     * Get platform wallet balance
     */
    static async getPlatformWalletBalance(): Promise<{ balance: number; pending: number; currency: string }> {
        const platformWallet = await PlatformWallet.findOne() || { balance: 0, pendingBalance: 0, currency: 'KES' };
        return {
            balance: platformWallet.balance,
            pending: platformWallet.pendingBalance,
            currency: platformWallet.currency
        };
    }
}