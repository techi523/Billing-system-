import { useState } from 'react';
import { Ticket, Printer, RefreshCw, Copy, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const VoucherCard = ({ voucher, index }: any) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 flex"
    >
        {/* Left Stub */}
        <div className="w-12 bg-slate-900 flex items-center justify-center relative">
            <div className="absolute top-0 bottom-0 right-0 border-r-2 border-dashed border-white/20"></div>
            {/* Cutout circles */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-slate-50 rounded-full"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-slate-50 rounded-full"></div>

            <span className="-rotate-90 text-white/30 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                SurfBill
            </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-5">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Voucher Code</p>
                    <div className="flex items-center gap-2 mt-1">
                        <code className="text-xl font-black text-slate-900 tracking-wider font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 group-hover:border-sky-200 group-hover:text-sky-700 transition-colors">
                            {voucher.code}
                        </code>
                        <button className="text-slate-300 hover:text-sky-500 transition-colors">
                            <Copy size={14} />
                        </button>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-slate-900">KES {voucher.price}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Unused
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-3">
                    <div className="px-2 py-1 rounded bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {voucher.plan}
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Batch #{voucher.batch}
                    </div>
                </div>
                <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                    <Printer size={16} />
                </button>
            </div>
        </div>
    </motion.div>
);

import Modal from '../Common/Modal';

const VoucherManager = () => {
    // Generate Mock Vouchers
    const vouchers = Array.from({ length: 9 }).map((_, i) => ({
        id: i,
        code: `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        price: 50,
        plan: '24 Hours',
        batch: 'A-202'
    }));
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2">Voucher Inventory</h2>
                        <p className="text-slate-400 font-medium">Generate and manage prepaid internet access tokens.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold backdrop-blur-md transition-all">
                            <Download size={18} /> Import
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-bold shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-1">
                            <RefreshCw size={18} /> Generate Batch
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vouchers.map((v, i) => (
                    <VoucherCard key={i} voucher={v} index={i} />
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Voucher Batch">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Linked Plan</label>
                        <select className="input-field">
                            <option>Daily Unlimited (KES 50)</option>
                            <option>Weekly Surf (KES 350)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Quantity</label>
                            <input className="input-field" type="number" defaultValue="50" />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Prefix</label>
                            <input className="input-field" placeholder="e.g. SB-DEC" />
                        </div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex gap-3">
                        <div className="mt-1 text-yellow-600">
                            <Ticket size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-yellow-900 text-sm">Printing Check</h4>
                            <p className="text-xs text-yellow-700 opacity-80 mt-1 leading-relaxed">Generated vouchers will be downloadable as a PDF sheet immediately after creation.</p>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary w-full py-4 text-sm uppercase tracking-widest">Start Generation</button>
                </form>
            </Modal>
        </div>
    );
};

export default VoucherManager;
