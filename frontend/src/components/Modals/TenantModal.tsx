import React from 'react';
import Modal from '../Common/Modal';

interface TenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const TenantModal: React.FC<TenantModalProps> = ({ isOpen, onClose, onSubmit }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Register New Tenant">
            <form className="space-y-6" onSubmit={onSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Organization Name</label>
                        <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:border-sky-500 focus:outline-none transition-all" placeholder="e.g. Acme Web Services" autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Namespace / Subdomain</label>
                        <div className="relative">
                            <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:border-sky-500 focus:outline-none transition-all" placeholder="acme" />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">.surfbill.app</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Admin Email</label>
                            <input required type="email" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:border-sky-500 focus:outline-none transition-all" placeholder="admin@acme.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Region</label>
                            <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-slate-900 font-bold focus:border-sky-500 focus:outline-none transition-all appearance-none cursor-pointer">
                                <option value="NAIROBI">Nairobi, Kenya</option>
                                <option value="MOMBASA">Mombasa, Kenya</option>
                                <option value="KAMPALA">Kampala, Uganda</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                    <h4 className="font-bold text-sky-900 text-sm">Onboarding Notice</h4>
                    <p className="text-xs text-sky-700 opacity-80 mt-1 leading-relaxed">The tenant will receive an automated invitation to set up their administrative password and connect their first MikroTik gateway.</p>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-sky-500 transition-all shadow-xl shadow-slate-900/10">
                    Provision Infrastructure
                </button>
            </form>
        </Modal>
    );
};

export default TenantModal;
