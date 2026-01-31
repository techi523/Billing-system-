import { useNavigate } from 'react-router-dom';
import {
    Zap,
    Shield,
    BarChart3,
    Wifi,
    ArrowRight,
    CheckCircle2,
    Cpu,
    MessageCircle,
    Terminal,
    RotateCw,
    ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import SupportFooter from '../components/Common/SupportFooter';
import SupportSection from '../components/Common/SupportSection';
import { OFFICIAL_SUPPORT } from '../constants';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <Wifi className="w-6 h-6" />,
            title: "MikroTik Integrated",
            description: "Native support for ROS v6 & v7. Zero-touch script generation for seamless Hotspot management.",
            color: "blue"
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Lightning Fast Payments",
            description: "M-Pesa Express & IntaSend integration. Subscribers get online instantly after payment.",
            color: "emerald"
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Real-time Analytics",
            description: "Monitor revenue, bandwidth, and active sessions as they happen with built-in Socket.io.",
            color: "indigo"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Production Ready",
            description: "Strict tenant isolation, comprehensive audit logs, and automated readiness checklists.",
            color: "rose"
        }
    ];

    const BenefitCard = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
            <div className="mb-6 transform group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">{description}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-600">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Wifi className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">SurfBill</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Features</a>
                        <a href="#scaling" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Scaling</a>
                        <a href="#support" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Support</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors px-4 py-2"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="bg-slate-900 text-white text-sm font-black px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-24 overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 -tr-slate-200 w-full h-full pointer-events-none -z-10">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-50 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-sky-50 rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-full uppercase tracking-widest mb-6">
                            The Ultimate ISP Billing Engine
                        </span>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8 max-w-4xl mx-auto">
                            Scale Your WiFi Business <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">
                                Without the Headache.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-12">
                            A production-grade, tenant-controlled SaaS for hotspot owners and ISPs.
                            Automated M-Pesa payments, real-time analytics, and MikroTik integration built for Kenya.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full sm:w-auto bg-indigo-600 text-white text-lg font-black px-10 py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-2 group"
                            >
                                Start Free Trial
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <a
                                href={OFFICIAL_SUPPORT.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto bg-white text-slate-900 text-lg font-black px-10 py-5 rounded-2xl border border-slate-200 hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-5 h-5 text-green-500" />
                                Talk to Sales
                            </a>
                        </div>

                        <div className="mt-16 flex items-center justify-center gap-8 grayscale opacity-50">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-slate-900" />
                                <span className="font-bold text-slate-900">M-Pesa Integrated</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-slate-900" />
                                <span className="font-bold text-slate-900">MikroTik Native</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-slate-900" />
                                <span className="font-bold text-slate-900">SLA Guaranteed</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Platform Preview */}
            <section className="py-20 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border border-white p-4 bg-white/50 backdrop-blur-xl">
                        <div className="w-full aspect-video bg-slate-900 rounded-[2.5rem] flex items-center justify-center relative group">
                            {/* Mock UI elements could go here, or an illustrative icon */}
                            <div className="flex flex-col items-center">
                                <BarChart3 className="w-24 h-24 text-indigo-500 mb-4 animate-pulse" />
                                <p className="text-white font-black text-2xl uppercase tracking-widest opacity-50">Command Center Preview</p>
                            </div>

                            {/* Decorative overlays */}
                            <div className="absolute top-8 left-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/5 w-48">
                                <div className="h-2 w-12 bg-indigo-500 rounded-full mb-3"></div>
                                <div className="h-4 w-full bg-white/20 rounded-full mb-2"></div>
                                <div className="h-4 w-2/3 bg-white/20 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Connect Section */}
            <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">Why Connect Your MikroTik?</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                            Transform your simple router into a powerful ISP management hub.
                            Connect to SurfBill and unlock enterprise-grade automation.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <BenefitCard
                            icon={<Zap className="w-8 h-8 text-yellow-400" />}
                            title="Zero Manual Config"
                            description="Forget manual firewall rules or hotspot setups. One script does it all, perfectly every time."
                        />
                        <BenefitCard
                            icon={<Cpu className="w-8 h-8 text-blue-400" />}
                            title="Goodbye Winbox"
                            description="Manage users, sessions, and speed limits directly from your SurfBill dashboard from anywhere."
                        />
                        <BenefitCard
                            icon={<Shield className="w-8 h-8 text-green-400" />}
                            title="Enhanced Security"
                            description="Least-privilege API users and automated firewall hardening keep your network safe."
                        />
                        <BenefitCard
                            icon={<RotateCw className="w-8 h-8 text-purple-400" />}
                            title="Automated Sync"
                            description="Packages and user limits are automatically pushed to your router in real-time."
                        />
                        <BenefitCard
                            icon={<BarChart3 className="w-8 h-8 text-pink-400" />}
                            title="Real-time Visibility"
                            description="Monitor CPU, traffic, and active users with beautiful live charts and deep analytics."
                        />
                        <BenefitCard
                            icon={<ArrowRight className="w-8 h-8 text-cyan-400" />}
                            title="Remote Control"
                            description="Reboot, monitor health, and update configurations remotely without needing VPNs."
                        />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Enterprise Features, <br />Available to Everyone.</h2>
                        <p className="text-slate-500 font-medium max-w-xl mx-auto">Everything you need to automate your internet business and maximize revenue from day one.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-xl hover:shadow-indigo-50/50 group"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110
                                    ${feature.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                                    ${feature.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : ''}
                                    ${feature.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : ''}
                                    ${feature.color === 'rose' ? 'bg-rose-50 text-rose-600' : ''}
                                `}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Scaling Section */}
            <section id="scaling" className="py-24 bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-20">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[150px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-indigo-400 font-black uppercase text-xs tracking-widest">Built for Growth</span>
                            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mt-4 mb-8">Ready to Scale to <br />10,000+ Users?</h2>
                            <p className="text-indigo-100/60 text-lg font-medium mb-10 leading-relaxed">
                                Our platform isn't just a billing tool. It's a scaling engine. With optimized session handling and multi-router support, we help you transition from a single hotspot to a multi-city ISP network.
                            </p>

                            <div className="space-y-4">
                                {[
                                    "Dedicated technical scaling team",
                                    "ISP-grade session management",
                                    "Custom bandwidth shaping",
                                    "White-label options for large ISPs"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-white font-bold">
                                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-10 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                                    <Cpu className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">Scaling Architecture</h4>
                                    <p className="text-indigo-100/40 text-xs">Platform v3.0 Core</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase text-indigo-300">
                                        <span>ISP Performance</span>
                                        <span>99.9%</span>
                                    </div>
                                    <div className="h-2 w-full bg-indigo-900/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: '99.9%' }}
                                            className="h-full bg-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase text-sky-300">
                                        <span>Payment Uptime</span>
                                        <span>100%</span>
                                    </div>
                                    <div className="h-2 w-full bg-sky-900/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: '100%' }}
                                            className="h-full bg-sky-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/register')}
                                className="w-full mt-10 bg-indigo-500 text-white font-black py-4 rounded-2xl hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-900/50"
                            >
                                Deploy Your Network
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final Support Section */}
            <div id="support" className="max-w-7xl mx-auto px-6 py-24">
                <SupportSection title="Non-Stop Scaling Assistance" />
            </div>

            <SupportFooter />
        </div>
    );
};

export default LandingPage;
