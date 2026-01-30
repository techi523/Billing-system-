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

    if (isLoading) return <div className="p-8 text-center font-bold">Loading Wallet...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <BackButton to="/tenant" variant="dark" label="Back" />
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">Wallet & Settlements</h1>
                            <p className="text-slate-500 font-bold">Manage your funds and track earnings</p>
                        </div>
                    </div>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="premium-card bg-white p-6 border-l-4 border-emerald-500 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Total Assets</p>
                        <h3 className="text-2xl font-black text-slate-900">KES {Number(balance?.balance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="premium-card bg-white p-6 border-l-4 border-blue-500 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Settled (Withdrawable)</p>
                        <h3 className="text-2xl font-black text-blue-600">KES {Number(balance?.settledBalance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="premium-card bg-white p-6 border-l-4 border-amber-500 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">In Escrow (Pending)</p>
                        <h3 className="text-2xl font-black text-amber-600">KES {Number(balance?.pendingBalance || 0).toLocaleString()}</h3>
                    </div>
                    <div className="premium-card bg-white p-6 border-l-4 border-rose-500 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Frozen / Disputed</p>
                        <h3 className="text-2xl font-black text-rose-600">KES {Number(balance?.frozenBalance || 0).toLocaleString()}</h3>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => { setShowWithdrawModal(true); setStep('REQUEST'); setMessage(''); }}
                        className="px-8 py-4 bg-sky-600 text-white font-black rounded-2xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all active:scale-95"
                    >
                        Withdraw Funds
                    </button>
                </div>

                {/* Transaction History */}
                <div className="premium-card bg-white overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xl font-black text-slate-900">Transaction History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Date</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Type</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Description</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-right">Balance After</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-600">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${tx.transactionType === 'CREDIT' ? 'bg-emerald-100 text-emerald-600' :
                                                tx.transactionType === 'DEBIT' ? 'bg-rose-100 text-rose-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {tx.transactionType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{tx.description}</td>
                                        <td className={`px-6 py-4 font-black text-right ${tx.transactionType === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {tx.transactionType === 'CREDIT' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900 text-right">{Number(tx.balanceAfter).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">Withdraw Funds</h2>

                        {message && (
                            <div className={`p-4 rounded-xl font-bold text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {message}
                            </div>
                        )}

                        {step === 'REQUEST' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Amount (KES)</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl font-bold focus:ring-2 focus:ring-sky-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Method</label>
                                    <select
                                        value={withdrawMethod}
                                        onChange={(e) => setWithdrawMethod(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl font-bold focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="MPESA">M-Pesa Number</option>
                                        <option value="BANK">Bank Account</option>
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setShowWithdrawModal(false)}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleWithdrawRequest}
                                        className="flex-1 py-3 bg-sky-600 text-white font-black rounded-xl"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Enter OTP</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl font-bold text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-sky-500"
                                        placeholder="000000"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setStep('REQUEST')}
                                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleWithdrawVerify}
                                        className="flex-1 py-3 bg-sky-600 text-white font-black rounded-xl"
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
