import React from 'react';
import Modal from '../Common/Modal';

interface PackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, onSubmit }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Design New Service Plan">
            <form className="space-y-6" onSubmit={onSubmit}>
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
    );
};

export default PackageModal;
