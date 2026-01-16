import { useState } from 'react';
import { CreditCard, Check, Zap, Clock, Edit3, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const PlanCard = ({ plan, index }: any) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className={`relative p-8 rounded-[2.5rem] transition-all duration-500 hover:-translate-y-2 ${plan.isPopular
            ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/30 ring-4 ring-slate-900/5'
            : 'bg-white text-slate-900 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/40'
            }`}
    >
        {plan.isPopular && (
            <div className="absolute top-0 right-0 bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-bl-2xl rounded-tr-[2rem]">
                Best Value
            </div>
        )}

        <div className="mb-8 relative">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${plan.isPopular ? 'bg-white/10 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                <Zap size={28} fill="currentColor" className="opacity-80" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold opacity-60">KES</span>
                <span className="text-4xl font-black tracking-tighter">{plan.price.toLocaleString()}</span>
            </div>
        </div>

        <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3">
                <div className={`p-1 rounded-full ${plan.isPopular ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <Clock size={12} />
                </div>
                <span className="text-sm font-bold opacity-80">{plan.duration} Validity</span>
            </div>
            <div className="flex items-center gap-3">
                <div className={`p-1 rounded-full ${plan.isPopular ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <Zap size={12} />
                </div>
                <span className="text-sm font-bold opacity-80">{plan.speed} Speed</span>
            </div>
            <div className="flex items-center gap-3">
                <div className={`p-1 rounded-full ${plan.isPopular ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <Check size={12} />
                </div>
                <span className="text-sm font-bold opacity-80">{plan.devices} Device Limit</span>
            </div>
        </div>

        <div className="flex gap-2">
            <button className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${plan.isPopular
                ? 'bg-white text-slate-900 hover:bg-sky-50'
                : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}>
                Edit Plan
            </button>
            <button className={`p-3 rounded-xl transition-all ${plan.isPopular
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-slate-100 hover:bg-rose-100 hover:text-rose-600'
                }`}>
                <Trash2 size={18} />
            </button>
        </div>
    </motion.div>
);

import Modal from '../Common/Modal';

const PackagePlans = () => {
    const [plans] = useState([
        { id: 1, name: 'Hourly Pass', price: 20, duration: '1 Hour', speed: '5 Mbps', devices: 1, isPopular: false },
        { id: 2, name: 'Daily Unlimited', price: 50, duration: '24 Hours', speed: '10 Mbps', devices: 2, isPopular: true },
        { id: 3, name: 'Weekly Surf', price: 350, duration: '7 Days', speed: '8 Mbps', devices: 3, isPopular: false },
        { id: 4, name: 'Monthly Pro', price: 1500, duration: '30 Days', speed: '20 Mbps', devices: 5, isPopular: false },
    ]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Service Plans</h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">Configure automated billing packages</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                    <Plus size={20} className="mr-2" strokeWidth={3} /> Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan, index) => (
                    <PlanCard key={plan.id} plan={plan} index={index} />
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Design New Service Plan">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Plan Name</label>
                        <input className="input-field" placeholder="e.g. Weekend Gamer Special" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Price (KES)</label>
                            <input className="input-field" placeholder="0.00" type="number" />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Speed Limit</label>
                            <select className="input-field">
                                <option>5 Mbps</option>
                                <option>10 Mbps</option>
                                <option>20 Mbps</option>
                                <option>100 Mbps</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Duration</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                '1 Hour', '24 Hours', '7 Days', '30 Days'
                            ].map(d => (
                                <button key={d} type="button" className="py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-sky-500 hover:text-white transition-all">{d}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-sky-50 rounded-2xl border border-sky-100">
                        <div className="flex-1">
                            <h4 className="font-bold text-sky-900">Make Popular</h4>
                            <p className="text-xs text-sky-700 opacity-80">Highlight this plan on the captive portal</p>
                        </div>
                        <input type="checkbox" className="w-6 h-6 rounded-lg text-sky-500 border-sky-300 focus:ring-sky-500" />
                    </div>
                    <button type="submit" className="btn-primary w-full py-4 text-sm uppercase tracking-widest">Publish Plan</button>
                </form>
            </Modal>
        </div>
    );
};

export default PackagePlans;
