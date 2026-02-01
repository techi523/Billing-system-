import { Router } from 'express';
import { WalletService } from '../services/wallet.service';
import { VerificationService } from '../services/verification.service';
import { AdminUser, Tenant } from '../models';
import { authMiddleware } from '../middleware/auth'; // Assuming auth middleware exists

const router = Router();

// Get wallet balance
router.get('/balance', authMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const wallet = await WalletService.getWalletBalanceByOwner(tenantId);
        res.json(wallet);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get wallet transactions
router.get('/transactions', authMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { limit, offset } = req.query;
        const transactions = await WalletService.getWalletTransactionsByOwner(tenantId, 'TENANT', Number(limit) || 50, Number(offset) || 0);
        res.json(transactions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Request withdrawal (initiates OTP)
router.post('/withdraw/request', authMiddleware, async (req: any, res) => {
    try {
        const { amount, method } = req.body;
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }


        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        if (tenant.withdrawalVerificationMethod !== 'NONE') {
            const target = req.user.email; // Default to email for OTP
            await VerificationService.sendOTP(target, 'EMAIL', tenantId, userId);
            return res.json({ message: 'OTP sent for verification', step: 'VERIFICATION_REQUIRED' });
        }

        const settlement = await WalletService.createSettlement(tenantId, amount, method, userId);
        res.json({ message: 'Withdrawal request created', settlement });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Verify and complete withdrawal
router.post('/withdraw/verify', authMiddleware, async (req: any, res) => {
    try {
        const { amount, method, otp } = req.body;
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const target = req.user.email;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }


        const verified = await VerificationService.verifyOTP(target, otp, userId);
        if (!verified) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const settlement = await WalletService.createSettlement(tenantId, amount, method, userId);
        res.json({ message: 'Withdrawal request verified and created', settlement });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Reconcile wallet balance
router.post('/reconcile', authMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await WalletService.reconcileWallet(tenantId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get transaction trace
router.get('/transactions/:id/trace', authMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const transactionId = req.params.id;
        const trace = await WalletService.getTransactionTrace(transactionId, tenantId);
        res.json(trace);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
