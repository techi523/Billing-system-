import { useState, useEffect } from 'react';
import axios from 'axios';
import BackButton from '../components/Common/BackButton';

const WalletPage = () => {
    const [balance, setBalance] = useState<any>(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('MPESA');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('REQUEST'); // REQUEST, VERIFY
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [balanceRes, transRes] = await Promise.all([
                axios.get('/api/v1/wallet/balance'),
                axios.get('/api/v1/wallet/transactions')
            ]);
            setBalance(balanceRes.data);
            setTransactions(transRes.data);
        } catch (error) {
            console.error('Failed to fetch wallet data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdrawRequest = async () => {
        try {
            const res = await axios.post('/api/v1/wallet/withdraw/request',
                { amount: parseFloat(withdrawAmount), method: withdrawMethod }
            );

            if (res.data.step === 'VERIFICATION_REQUIRED') {
                setStep('VERIFY');
                setMessage('An OTP has been sent to your email.');
            } else {
                setMessage('Withdrawal request submitted successfully!');
                setShowWithdrawModal(false);
                fetchData();
            }
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to request withdrawal');
        }
    };

    const handleWithdrawVerify = async () => {
        try {
            await axios.post('/api/v1/wallet/withdraw/verify',
                { amount: parseFloat(withdrawAmount), method: withdrawMethod, otp }
            );
            setMessage('Withdrawal request verified and submitted!');
            setShowWithdrawModal(false);
            setStep('REQUEST');
            fetchData();
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Verification failed');
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center transition-colors duration-300">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[var(--border-subtle)] border-t-sky-500 rounded-full animate-spin"></div>
                <p className="font-black text-[var(--text-muted)] uppercase tracking-widest text-xs">Accessing Secure Vault...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--bg-main)] p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <BackButton to="/tenant" variant="dark" label="Back" />
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-primary)]">Wallet & Settlements</h1>
                            <p className="text-[var(--text-secondary)] font-bold">Manage your funds and track earnings</p>
                        </div>
                    </div>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="premium-card bg-[var(--bg-surface)] border-[var(--border-subtle)] border-l-4 border-l-emerald-500 shadow-sm transition-colors">
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase mb-1">Total Assets</p>
                        <h3 className="text-2xl font-black text-[var(--text-primary)]">KES {Number(balance?.balance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="premium-card bg-[var(--bg-surface)] border-[var(--border-subtle)] border-l-4 border-l-sky-500 shadow-sm transition-colors">
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase mb-1">Settled (Withdrawable)</p>
                        <h3 className="text-2xl font-black text-sky-500">KES {Number(balance?.settledBalance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="premium-card bg-[var(--bg-surface)] border-[var(--border-subtle)] border-l-4 border-l-amber-500 shadow-sm transition-colors">
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase mb-1">In Escrow (Pending)</p>
                        <h3 className="text-2xl font-black text-amber-500">KES {Number(balance?.pendingBalance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="premium-card bg-[var(--bg-surface)] border-[var(--border-subtle)] border-l-4 border-l-rose-500 shadow-sm transition-colors">
                        <p className="text-xs font-black text-[var(--text-muted)] uppercase mb-1">Frozen / Disputed</p>
                        <h3 className="text-2xl font-black text-rose-500">KES {Number(balance?.frozenBalance || 0).toLocaleString()}</h3>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => { setShowWithdrawModal(true); setStep('REQUEST'); setMessage(''); }}
                        className="px-8 py-4 bg-sky-600 text-white font-black rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-500 transition-all active:scale-95"
                    >
                        Withdraw Funds
                    </button>
                </div>

                {/* Transaction History */}
                <div className="premium-card bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden transition-colors">
                    <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
                        <h2 className="text-xl font-black text-[var(--text-primary)]">Transaction History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--bg-surface-elevated)]">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)]">
                                {transactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-[var(--bg-surface-elevated)] transition-colors">
                                        <td className="px-6 py-4 font-bold text-[var(--text-secondary)]">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${tx.transactionType === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' :
                                                tx.transactionType === 'DEBIT' ? 'bg-rose-500/10 text-rose-500' :
                                                    'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]'
                                                }`}>
                                                {tx.transactionType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{tx.description}</td>
                                        <td className={`px-6 py-4 font-black text-right ${tx.transactionType === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {tx.transactionType === 'CREDIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-black text-[var(--text-primary)] text-right">{Number(tx.balanceAfter).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all animate-in fade-in">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Withdraw Funds</h2>

                        {message && (
                            <div className={`p-4 rounded-xl font-bold text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {message}
                            </div>
                        )}

                        {step === 'REQUEST' ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Amount (KES)</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full px-6 py-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-sky-500 transition-all text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Method</label>
                                    <select
                                        value={withdrawMethod}
                                        onChange={(e) => setWithdrawMethod(e.target.value)}
                                        className="w-full px-6 py-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-sky-500 transition-all"
                                    >
                                        <option value="MPESA">M-Pesa Number</option>
                                        <option value="BANK">Bank Account</option>
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setShowWithdrawModal(false)}
                                        className="flex-1 py-4 bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] font-bold rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleWithdrawRequest}
                                        className="flex-1 py-4 bg-sky-600 text-white font-black rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-500 transition-all hover:scale-[1.02]"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block text-center">Enter Verification Code</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full px-6 py-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl font-black text-center text-4xl tracking-[0.5em] text-sky-500 focus:outline-none focus:border-sky-500 transition-all"
                                        placeholder="000000"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setStep('REQUEST')}
                                        className="flex-1 py-4 bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] font-bold rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleWithdrawVerify}
                                        className="flex-1 py-4 bg-sky-600 text-white font-black rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-500 transition-all hover:scale-[1.02]"
                                    >
                                        Verify & Withdraw
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
