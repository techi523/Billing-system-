import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, Facebook, X, HelpCircle } from 'lucide-react';
import { useSupport } from '../../context/SupportContext';
import { motion, AnimatePresence } from 'framer-motion';

const SupportButton: React.FC = () => {
    const { getSetting } = useSupport();
    const [isOpen, setIsOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(true);

    const whatsappUrl = getSetting('CONTACT_WHATSAPP_URL');
    const supportMessage = encodeURIComponent(getSetting('CONTACT_SUPPORT_MESSAGE'));
    const fullWhatsappUrl = `${whatsappUrl}?text=${supportMessage}`;

    const contactMethods = [
        {
            icon: <MessageCircle className="w-5 h-5" />,
            label: 'WhatsApp',
            href: fullWhatsappUrl,
            color: 'bg-green-500',
            hover: 'hover:bg-green-600'
        },
        {
            icon: <Phone className="w-5 h-5" />,
            label: 'Call Us',
            href: getSetting('CONTACT_PHONE_TEL'),
            color: 'bg-blue-500',
            hover: 'hover:bg-blue-600'
        },
        {
            icon: <Mail className="w-5 h-5" />,
            label: 'Email',
            href: getSetting('CONTACT_EMAIL_MAILTO'),
            color: 'bg-red-500',
            hover: 'hover:bg-red-600'
        },
        {
            icon: <Facebook className="w-5 h-5" />,
            label: 'Facebook',
            href: getSetting('CONTACT_FACEBOOK_URL'),
            color: 'bg-blue-700',
            hover: 'hover:bg-blue-800'
        }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Contact Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="flex flex-col gap-2 mb-2"
                    >
                        {contactMethods.map((method, index) => (
                            <motion.a
                                key={index}
                                href={method.href}
                                target={method.href.startsWith('http') ? '_blank' : undefined}
                                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg text-white transition-all transform hover:scale-105 ${method.color} ${method.hover}`}
                                aria-label={method.label}
                            >
                                {method.icon}
                                <span className="text-sm font-medium whitespace-nowrap">{method.label}</span>
                            </motion.a>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tooltip */}
            <AnimatePresence>
                {showTooltip && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white text-gray-800 px-4 py-2 rounded-lg shadow-xl border border-gray-100 mb-2 relative mr-2"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
                            className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-0.5 hover:bg-gray-300"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <p className="text-sm font-semibold">Need Help?</p>
                        <p className="text-xs text-gray-500">Chat with support</p>
                        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-gray-100 rotate-45"></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all ${isOpen ? 'bg-gray-800' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                aria-label="Contact Support"
            >
                {isOpen ? <X className="w-8 h-8" /> : <HelpCircle className="w-8 h-8" />}
            </motion.button>
        </div>
    );
};

export default SupportButton;
