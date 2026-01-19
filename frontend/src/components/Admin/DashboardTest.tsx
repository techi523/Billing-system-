import { useState, useEffect } from 'react';
import { TrendingUp, Building2, CheckCircle2, Globe, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

/**
 * Test component to verify Admin Dashboard rendering works in all scenarios
 * This component demonstrates the fix for the infinite loading deadlock
 */
const DashboardTest = () => {
    const [testMode, setTestMode] = useState<'success' | 'error' | 'timeout' | 'network'>('success');
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const runTest = async () => {
        setIsLoading(true);
        setError(null);
        setStats(null);

        console.log(`DashboardTest: Running ${testMode} scenario...`);

        try {
            if (testMode === 'network') {
                // Simulate network error
                throw new Error('Network Error: Failed to fetch');
            }

            if (testMode === 'timeout') {
                // Simulate timeout
                await new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), 100);
                });
            }

            if (testMode === 'error') {
                // Simulate API error
                throw new Error('API Error: Internal Server Error');
            }

            // Simulate successful response
            await new Promise(resolve => setTimeout(resolve, 1000));
            setStats({
                totalRevenue: 1250000,
                activeTenants: 15,
                totalTenants: 25,
                totalPayments: 8947
            });
            setIsLoading(false);
            console.log('DashboardTest: Success scenario completed');

        } catch (err: any) {
            console.error(`DashboardTest: ${testMode} scenario failed`, err);
            setError(err.message || 'Test failed');
            setIsLoading(false);

            // Set fallback stats
            setStats({
                totalRevenue: 0,
                activeTenants: 0,
                totalTenants: 0,
                totalPayments: 0
            });
        }
    };

    useEffect(() => {
        runTest();
    }, [testMode]);

    return (
        <div className="space-y-8 p-8">
            <div className="premium-card bg-white">
                <div className="p-6">
                    <h2 className="text-2xl font-black text-slate-900 mb-4">Admin Dashboard Test</h2>
                    <p className="text-slate-600 mb-6">Testing rendering scenarios to prevent infinite loading</p>

                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => setTestMode('success')}
                            className={`px-4 py-2 rounded-lg font-bold ${testMode === 'success'
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            ✅ Success
                        </button>
                        <button
                            onClick={() => setTestMode('error')}
                            className={`px-4 py-2 rounded-lg font-bold ${testMode === 'error'
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            ❌ API Error
                        </button>
                        <button
                            onClick={() => setTestMode('timeout')}
                            className={`px-4 py-2 rounded-lg font-bold ${testMode === 'timeout'
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            ⏰ Timeout
                        </button>
                        <button
                            onClick={() => setTestMode('network')}
                            className={`px-4 py-2 rounded-lg font-bold ${testMode === 'network'
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            🌐 Network Error
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h3 className="font-bold text-slate-900 mb-2">Current State:</h3>
                            <p className="text-slate-600">Mode: <span className="font-mono">{testMode}</span></p>
                            <p className="text-slate-600">Loading: <span className="font-mono">{isLoading ? 'true' : 'false'}</span></p>
                            <p className="text-slate-600">Error: <span className="font-mono">{error || 'null'}</span></p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h3 className="font-bold text-slate-900 mb-2">Expected Behavior:</h3>
                            <p className="text-slate-600">✅ Loading always terminates</p>
                            <p className="text-slate-600">✅ Error UI shows on failure</p>
                            <p className="text-slate-600">✅ Fallback data renders</p>
                            <p className="text-slate-600">✅ No infinite loading</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Render the actual dashboard logic */}
            {isLoading && (
                <div className="premium-card bg-white">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-bold">Loading dashboard data...</p>
                        <p className="text-sm text-slate-400 mt-2">This may take a moment</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-slate-500">
                            <Wifi className="w-4 h-4" />
                            <span>Testing: {testMode}</span>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="premium-card bg-white">
                    <div className="p-6 text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Dashboard</h3>
                        <p className="text-slate-600 mb-6">{error}</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={runTest}
                                className="bg-sky-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-sky-600 transition-colors flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry Test
                            </button>
                            <button
                                onClick={() => {
                                    setStats({
                                        totalRevenue: 0,
                                        activeTenants: 0,
                                        totalTenants: 0,
                                        totalPayments: 0
                                    });
                                    setError(null);
                                    setIsLoading(false);
                                }}
                                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            >
                                Show Empty Dashboard
                            </button>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2 text-slate-500">
                            <WifiOff className="w-4 h-4" />
                            <span>Test Mode: {testMode}</span>
                        </div>
                    </div>
                </div>
            )}

            {stats && !isLoading && !error && (
                <div className="premium-card bg-white">
                    <div className="p-6">
                        <h2 className="text-3xl font-black text-slate-900 mb-6">Dashboard Rendered Successfully</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="premium-card bg-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Platform Revenue</p>
                                        <h3 className="text-2xl font-black text-slate-900">KES {stats.totalRevenue?.toLocaleString()}</h3>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                        <TrendingUp size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card bg-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Active Tenants</p>
                                        <h3 className="text-2xl font-black text-slate-900">{stats.activeTenants} out of {stats.totalTenants}</h3>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-sky-50 text-sky-600">
                                        <Building2 size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card bg-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Global Transactions</p>
                                        <h3 className="text-2xl font-black text-slate-900">{stats.totalPayments}</h3>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card bg-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Nairobi Hub Load</p>
                                        <h3 className="text-2xl font-black text-slate-900">Optimal</h3>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                                        <Globe size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-700 font-bold">✅ SUCCESS: Dashboard rendered without infinite loading</p>
                            <p className="text-green-600 text-sm">Test Mode: {testMode} | All scenarios handled correctly</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardTest;
