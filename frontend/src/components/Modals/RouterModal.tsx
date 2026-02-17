import React from 'react';
import { Server } from 'lucide-react';
import Modal from '../Common/Modal';

interface RouterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const RouterModal: React.FC<RouterModalProps> = ({ isOpen, onClose, onSubmit }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Deploy New Network Node">
            <form className="space-y-6" onSubmit={onSubmit}>
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Node Name</label>
                    <input className="input-field" placeholder="e.g. CBD Distribution Hub" autoFocus />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">IP Address / DNS</label>
                    <div className="relative">
                        <input className="input-field pl-12 font-mono" placeholder="192.168.88.1" />
                        <Server size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">API Port</label>
                        <input className="input-field" defaultValue="8728" />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Location</label>
                        <input className="input-field" placeholder="Coordinates" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Admin Credentials</label>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" placeholder="Username" />
                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" type="password" placeholder="Password" />
                    </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-sm uppercase tracking-widest">Initialise Connection</button>
            </form>
        </Modal>
    );
};

export default RouterModal;
