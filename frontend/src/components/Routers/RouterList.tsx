import { useState } from 'react';
import { Radio, Wifi, Activity, MoreVertical, Plus, Server } from 'lucide-react';
import { motion } from 'framer-motion';

const RouterCard = ({ router, index }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 overflow-hidden hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-500"
    >
        {/* Ambient Glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] -mr-16 -mt-16 transition-all duration-700 ${router.status === 'online' ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'}`}></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl ${router.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} transition-colors`}>
                    <Radio size={24} strokeWidth={2.5} />
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                    <MoreVertical size={20} />
                </button>
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">{router.name}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    {router.ip}
                    <span className={`w-2 h-2 rounded-full ${router.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-black/5 transition-all border border-transparent group-hover:border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Activity size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Load</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{router.cpuLoad}%</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-black/5 transition-all border border-transparent group-hover:border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Wifi size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Users</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{router.activeUsers}</p>
                </div>
            </div>
        </div>
    </motion.div>
);

import RouterModal from '../Modals/RouterModal';

const RouterList = () => {
    // Mock Data for Demo
    const [routers] = useState([
        { id: 1, name: 'Main Hub - Nairobi', ip: '192.168.88.1', status: 'online', cpuLoad: 12, activeUsers: 45 },
        { id: 2, name: 'Backup Node - Westlands', ip: '10.0.0.1', status: 'online', cpuLoad: 8, activeUsers: 23 },
        { id: 3, name: 'Kiosk Relay 4', ip: '10.0.50.1', status: 'offline', cpuLoad: 0, activeUsers: 0 },
        { id: 4, name: 'Fiber Gateway', ip: '172.16.0.1', status: 'online', cpuLoad: 45, activeUsers: 128 },
    ]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleRouterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Network Nodes</h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">Manage physical infrastructure and gateways</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                    <Plus size={20} strokeWidth={3} />
                    <span>Add Node</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {routers.map((router, index) => (
                    <RouterCard key={router.id} router={router} index={index} />
                ))}

                {/* Add New Placeholder Effect */}
                <motion.button
                    onClick={() => setIsModalOpen(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="group relative rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-4 hover:border-sky-400/50 hover:bg-sky-50/10 transition-all duration-300 min-h-[300px]"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                        <Server size={32} />
                    </div>
                    <p className="font-black text-slate-400 text-sm uppercase tracking-widest group-hover:text-sky-600 transition-colors">Deploy New Node</p>
                </motion.button>
            </div>

            <RouterModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleRouterSubmit}
            />
        </div>
    );
};

export default RouterList;
