import { useState } from 'react';
import { ArrowRight, Lock, Mail, Shield, Wifi } from 'lucide-react';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input.tsx';
import { Card } from '../Common/Card.tsx';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock successful login
            if (email && password) {
                // Redirect or set auth state
                console.log('Login successful');
            } else {
                throw new Error('Invalid credentials');
            }
        } catch {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl">
                <div className="p-8">
                    {/* Logo Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-4">
                            <Wifi className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                        <p className="text-slate-600 text-sm">Sign in to your SurfBill Command Center</p>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-slate-600 font-medium">System Online</span>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Admin Email
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <Input
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 text-sm font-semibold"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Access Dashboard
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-500">
                            Powered by SurfBill v2.0 • Encrypted Authentication
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Login;
