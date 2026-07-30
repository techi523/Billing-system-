import React, { useState } from 'react';
import axios from 'axios';
import { X, Building2, User, Phone, Mail, Globe, MapPin, Server, Users, Calendar, DollarSign, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnterpriseLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SUITABLE_SECTORS = [
    'Large ISPs', 'Fibre Providers', 'Corporate Networks',
    'Universities', 'Government Institutions', 'Hotels & Hospitality',
    'Multi-Branch Organizations', 'Large Hotspot Operators', 'Telecom Providers'
];

const FEATURE_OPTIONS = [
    'Unlimited Subscribers', 'Unlimited MikroTik Routers', 'Multi-Location Management',
    'Custom Branding & White Label', 'Advanced Analytics', 'Dedicated Account Manager',
    'SLA Agreements & Priority Support', 'Custom API Integrations', 'Dedicated Infrastructure'
];

export const EnterpriseLeadModal: React.FC<EnterpriseLeadModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        companyName: '',
        registrationNumber: '',
        contactPerson: '',
        position: '',
        phone: '',
        altPhone: '',
        email: '',
        website: '',
        country: 'Kenya',
        region: '',
        physicalAddress: '',
        currentIspSize: '1000 - 5000 Subscribers',
        expectedGrowth: 'Double in 12 Months',
        subscriberCount: 1500,
        activeUserCount: 1000,
        routerCount: 10,
        currentBillingPlatform: '',
        requiredFeatures: ['Unlimited Subscribers', 'Unlimited MikroTik Routers', 'SLA Agreements & Priority Support'],
        expectedLaunchDate: 'Immediate (Within 30 Days)',
        monthlyBudget: 'KES 25,000 - KES 100,000',
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleFeature = (feature: string) => {
        setFormData(prev => {
            const exists = prev.requiredFeatures.includes(feature);
            if (exists) {
                return { ...prev, requiredFeatures: prev.requiredFeatures.filter(f => f !== feature) };
            } else {
                return { ...prev, requiredFeatures: [...prev.requiredFeatures, feature] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            const res = await axios.post('/api/v1/enterprise/inquire', formData);
            if (res.data.success) {
                setIsSubmitted(true);
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Failed to submit enterprise request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white my-8 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    ENTERPRISE ISP TIER • CONTACT SALES
                                </span>
                                <h2 className="text-xl md:text-2xl font-black mt-1">Request Enterprise Solution & Quote</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {isSubmitted ? (
                        <div className="p-12 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black">Enterprise Request Received!</h3>
                                <p className="text-slate-400 max-w-md mx-auto text-sm">
                                    Thank you for your interest in SurfBill Enterprise. Our Enterprise Sales Account Executive will review your requirements and deliver a formal quotation within 2 hours.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition shadow-lg shadow-sky-500/20"
                            >
                                Return to Platform
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">

                            {/* Suitable For Banner */}
                            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 space-y-2">
                                <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">Built for High-Scale Operations:</p>
                                <div className="flex flex-wrap gap-2">
                                    {SUITABLE_SECTORS.map((sec, idx) => (
                                        <span key={idx} className="px-2.5 py-1 bg-slate-900 text-slate-300 rounded-lg text-xs font-medium border border-slate-700">
                                            ✓ {sec}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-semibold">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Section 1: Business Profile */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-sky-400" /> 1. Business & Company Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Company / ISP Name *</label>
                                        <input
                                            type="text" required name="companyName" value={formData.companyName} onChange={handleChange}
                                            placeholder="e.g. FiberNet Kenya Ltd"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Business Registration / Reg No.</label>
                                        <input
                                            type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange}
                                            placeholder="e.g. CPR/2024/198234"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Website URL</label>
                                        <input
                                            type="text" name="website" value={formData.website} onChange={handleChange}
                                            placeholder="https://fibernet.co.ke"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Country & Region</label>
                                        <input
                                            type="text" name="region" value={formData.region} onChange={handleChange}
                                            placeholder="Nairobi, Kenya"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact Person */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <User className="w-4 h-4 text-sky-400" /> 2. Executive Contact Person
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Contact Person Name *</label>
                                        <input
                                            type="text" required name="contactPerson" value={formData.contactPerson} onChange={handleChange}
                                            placeholder="e.g. David Mutua"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Position / Title</label>
                                        <input
                                            type="text" name="position" value={formData.position} onChange={handleChange}
                                            placeholder="Chief Technology Officer (CTO)"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone Number *</label>
                                        <input
                                            type="text" required name="phone" value={formData.phone} onChange={handleChange}
                                            placeholder="+254 712 345 678"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Business Email Address *</label>
                                        <input
                                            type="email" required name="email" value={formData.email} onChange={handleChange}
                                            placeholder="d.mutua@fibernet.co.ke"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Network Capacity & Scope */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <Server className="w-4 h-4 text-sky-400" /> 3. Current Network Scale & Requirements
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Total Subscribers</label>
                                        <input
                                            type="number" name="subscriberCount" value={formData.subscriberCount} onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">MikroTik Routers</label>
                                        <input
                                            type="number" name="routerCount" value={formData.routerCount} onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1">Current Billing System</label>
                                        <input
                                            type="text" name="currentBillingPlatform" value={formData.currentBillingPlatform} onChange={handleChange}
                                            placeholder="Manual / Splynx / Radius Desk"
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Required Enterprise Features */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-300">Required Enterprise Capabilities:</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {FEATURE_OPTIONS.map((ft, idx) => {
                                        const isSelected = formData.requiredFeatures.includes(ft);
                                        return (
                                            <button
                                                type="button"
                                                key={idx}
                                                onClick={() => toggleFeature(ft)}
                                                className={`p-3 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${isSelected ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                            >
                                                <span>{ft}</span>
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 5: Timeline & Budget */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Expected Launch Date</label>
                                    <select
                                        name="expectedLaunchDate" value={formData.expectedLaunchDate} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                    >
                                        <option>Immediate (Within 30 Days)</option>
                                        <option>1 to 3 Months</option>
                                        <option>3 to 6 Months</option>
                                        <option>Planning / Budgeting Phase</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">Estimated Monthly Budget Range</label>
                                    <select
                                        name="monthlyBudget" value={formData.monthlyBudget} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                    >
                                        <option>KES 25,000 - KES 50,000</option>
                                        <option>KES 50,000 - KES 150,000</option>
                                        <option>KES 150,000 - KES 500,000+</option>
                                        <option>Custom SLA Negotiated</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">Additional Requirements / Notes</label>
                                <textarea
                                    rows={3} name="notes" value={formData.notes} onChange={handleChange}
                                    placeholder="Describe any custom integrations, RADIUS setups, or specific SLAs required..."
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                                />
                            </div>

                            {/* Submit CTA */}
                            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                                <button
                                    type="button" onClick={onClose}
                                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={isSubmitting}
                                    className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting Request...' : 'Submit Quote Request'}
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default EnterpriseLeadModal;
