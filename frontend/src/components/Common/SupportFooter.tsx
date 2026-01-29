import React from 'react';
import { MessageCircle, Phone, Mail, Facebook } from 'lucide-react';
import { useSupport } from '../../context/SupportContext';

const SupportFooter: React.FC = () => {
    const { getSetting } = useSupport();

    const whatsapp = getSetting('CONTACT_WHATSAPP');
    const whatsappUrl = getSetting('CONTACT_WHATSAPP_URL');
    const phone = getSetting('CONTACT_PHONE');
    const phoneTel = getSetting('CONTACT_PHONE_TEL');
    const email = getSetting('CONTACT_EMAIL');
    const emailMailto = getSetting('CONTACT_EMAIL_MAILTO');
    const facebookPage = getSetting('CONTACT_FACEBOOK_PAGE');
    const facebookUrl = getSetting('CONTACT_FACEBOOK_URL');

    return (
        <footer className="w-full py-8 px-6 bg-gray-50 border-t border-gray-200">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex flex-col items-center md:items-start">
                    <h3 className="text-lg font-bold text-indigo-600 mb-1">SurfBill Support</h3>
                    <p className="text-sm text-gray-500 max-w-xs text-center md:text-left">
                        Reliable billing and network management solutions. Need help? Contact us anytime.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
                        <div className="p-2 rounded-full bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{whatsapp}</span>
                    </a>

                    <a href={phoneTel} className="flex flex-col items-center gap-2 group">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Phone className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{phone}</span>
                    </a>

                    <a href={emailMailto} className="flex flex-col items-center gap-2 group">
                        <div className="p-2 rounded-full bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                            <Mail className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Email Us</span>
                    </a>

                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
                        <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Facebook className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{facebookPage}</span>
                    </a>
                </div>

                <div className="text-center md:text-right">
                    <p className="text-xs text-gray-400">© {new Date().getFullYear()} SurfBill. All rights reserved.</p>
                    <div className="flex gap-4 mt-2 justify-center md:justify-end">
                        <span className="text-[10px] text-gray-300">Professional</span>
                        <span className="text-[10px] text-gray-300">Secure</span>
                        <span className="text-[10px] text-gray-300">Reliable</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default SupportFooter;
