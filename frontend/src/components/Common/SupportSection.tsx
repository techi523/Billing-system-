import React from 'react';
import { MessageCircle, Phone, Mail } from 'lucide-react';
import { OFFICIAL_SUPPORT } from '../../constants';
import { motion } from 'framer-motion';

const SupportSection: React.FC<{ title?: string }> = ({ title = "Need Scaling Support?" }) => {
    return (
        <section className="py-12 px-6 bg-gradient-to-br from-indigo-50 to-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden relative">
            {/* Decorative element */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>

            <div className="max-w-4xl mx-auto text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                        {title}
                    </h3>
                    <p className="text-slate-500 font-medium mb-8 max-w-lg mx-auto">
                        Connect with our 24/7 technical team for setup, custom modules, or ISP scaling advice.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.a
                        whileHover={{ y: -5 }}
                        href={OFFICIAL_SUPPORT.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 group transition-all"
                    >
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">WhatsApp</p>
                            <p className="text-sm font-bold text-slate-900">{OFFICIAL_SUPPORT.whatsapp}</p>
                        </div>
                    </motion.a>

                    <motion.a
                        whileHover={{ y: -5 }}
                        href={`tel:${OFFICIAL_SUPPORT.phone}`}
                        className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 group transition-all"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Call Support</p>
                            <p className="text-sm font-bold text-slate-900">{OFFICIAL_SUPPORT.phone}</p>
                        </div>
                    </motion.a>

                    <motion.a
                        whileHover={{ y: -5 }}
                        href={OFFICIAL_SUPPORT.emailMailto}
                        className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 group transition-all"
                    >
                        <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Email</p>
                            <p className="text-sm font-bold text-slate-900">{OFFICIAL_SUPPORT.email}</p>
                        </div>
                    </motion.a>
                </div>
            </div>
        </section>
    );
};

export default SupportSection;
