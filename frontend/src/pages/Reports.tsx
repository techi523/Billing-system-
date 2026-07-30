import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileText, Download, RefreshCw, Calendar, Filter, DollarSign, Users, Router, Wifi, CreditCard } from 'lucide-react';

type ReportType = 'revenue' | 'subscribers' | 'routers' | 'bandwidth' | 'payments';

interface RevenueReport { summary: { total: number; count: number; average: number }; payments: any[] }
interface SubReport { summary: { total: number; active: number; expired: number }; subscribers: any[] }
interface RouterReport { summary: { total: number; online: number; offline: number }; routers: any[] }
interface BandwidthReport { summary: { totalSessions: number; activeSessions: number; totalIn: number; totalOut: number; totalBytes: number }; sessions: any[] }
interface PaymentsReport { summary: { total: number; success: number; failed: number; pending: number; totalRevenue: number }; payments: any[] }

const fmtKES = (v: number) => `KES ${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtMB = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`;

const REPORT_TABS = [
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'subscribers', label: 'Subscribers', icon: Users },
    { key: 'routers', label: 'Routers', icon: Router },
    { key: 'bandwidth', label: 'Bandwidth', icon: Wifi },
    { key: 'payments', label: 'Payments', icon: CreditCard },
] as const;

const Reports: React.FC = () => {
    const [type, setType] = useState<ReportType>('revenue');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [endDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setData(null);
        try {
            const params: Record<string, string> = { startDate, endDate };
            if (type === 'payments' && statusFilter) params.status = statusFilter;
            const res = await axios.get(`/api/v1/admin/reports/${type}`, { params });
            setData(res.data);
        } catch (e) {
            console.error('[Reports] Load failed:', e);
        } finally { setLoading(false); }
    }, [type, startDate, endDate, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const exportCSV = async () => {
        try {
            const params: Record<string, string> = { startDate, endDate, format: 'csv' };
            if (type === 'payments' && statusFilter) params.status = statusFilter;
            const res = await axios.get(`/api/v1/admin/reports/${type}`, { params, responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url; a.download = `${type}-report.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { console.error('[Reports] Export failed:', e); }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-500" /> Reports Center
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">Generate and export business reports</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={load} disabled={loading}
                        className="p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl hover:border-sky-500 transition-all disabled:opacity-60">
                        <RefreshCw className={`w-4 h-4 text-[var(--text-muted)] ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {REPORT_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.key} onClick={() => setType(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${type === tab.key ? 'bg-sky-500 text-white shadow-md' : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-sky-500'}`}>
                            <Icon className="w-4 h-4" /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5">
                <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase text-[var(--text-muted)]">
                    <Filter className="w-3.5 h-3.5" /> Filters
                </div>
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">From</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] py-2 px-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-sky-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">To</label>
                        <input type="date" value={endDate} readOnly
                            className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] py-2 px-3 rounded-xl text-sm font-semibold opacity-70 cursor-not-allowed" />
                    </div>
                    {type === 'payments' && (
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Status</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] py-2 px-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-sky-500 cursor-pointer">
                                <option value="">All Statuses</option>
                                <option value="SUCCESS">Success</option>
                                <option value="FAILED">Failed</option>
                                <option value="PENDING">Pending</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {type === 'revenue' && data.summary && (<>
                            <SummaryCard label="Total Revenue" value={fmtKES(data.summary.total)} />
                            <SummaryCard label="Transactions" value={String(data.summary.count)} />
                            <SummaryCard label="Avg Transaction" value={fmtKES(data.summary.average)} />
                        </>)}
                        {type === 'subscribers' && data.summary && (<>
                            <SummaryCard label="Total" value={String(data.summary.total)} />
                            <SummaryCard label="Active" value={String(data.summary.active)} color="text-emerald-600" />
                            <SummaryCard label="Expired" value={String(data.summary.expired)} color="text-rose-600" />
                        </>)}
                        {type === 'routers' && data.summary && (<>
                            <SummaryCard label="Total" value={String(data.summary.total)} />
                            <SummaryCard label="Online" value={String(data.summary.online)} color="text-emerald-600" />
                            <SummaryCard label="Offline" value={String(data.summary.offline)} color="text-rose-600" />
                        </>)}
                        {type === 'bandwidth' && data.summary && (<>
                            <SummaryCard label="Sessions" value={String(data.summary.totalSessions)} />
                            <SummaryCard label="Download" value={fmtMB(data.summary.totalIn)} />
                            <SummaryCard label="Upload" value={fmtMB(data.summary.totalOut)} />
                            <SummaryCard label="Total" value={fmtMB(data.summary.totalBytes)} />
                        </>)}
                        {type === 'payments' && data.summary && (<>
                            <SummaryCard label="Revenue" value={fmtKES(data.summary.totalRevenue)} color="text-emerald-600" />
                            <SummaryCard label="Success" value={String(data.summary.success)} color="text-emerald-600" />
                            <SummaryCard label="Failed" value={String(data.summary.failed)} color="text-rose-600" />
                            <SummaryCard label="Pending" value={String(data.summary.pending)} color="text-amber-600" />
                        </>)}
                    </div>

                    {/* Data Table */}
                    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                            <h3 className="text-sm font-black text-[var(--text-primary)] capitalize">{type} Data</h3>
                            <span className="text-xs text-[var(--text-muted)] font-semibold">
                                {type === 'revenue' ? data.payments?.length : type === 'subscribers' ? data.subscribers?.length : type === 'routers' ? data.routers?.length : type === 'bandwidth' ? data.sessions?.length : data.payments?.length} records
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            {type === 'revenue' && <RevenueTable rows={data.payments} />}
                            {type === 'subscribers' && <SubscribersTable rows={data.subscribers} />}
                            {type === 'routers' && <RoutersTable rows={data.routers} />}
                            {type === 'bandwidth' && <BandwidthTable rows={data.sessions} />}
                            {type === 'payments' && <PaymentsTable rows={data.payments} />}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};

const SummaryCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-[var(--text-primary)]' }) => (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 text-center">
        <div className={`text-xl font-black ${color}`}>{value}</div>
        <div className="text-xs text-[var(--text-muted)] font-semibold uppercase mt-1">{label}</div>
    </div>
);

const TH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <th className="text-left py-3 px-4 text-xs font-black uppercase text-[var(--text-muted)] whitespace-nowrap">{children}</th>
);
const TD: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono }) => (
    <td className={`py-3 px-4 text-sm text-[var(--text-secondary)] ${mono ? 'font-mono text-xs' : 'font-semibold'}`}>{children}</td>
);

const fmtKESCents = (v: number) => `KES ${(v / 100).toFixed(2)}`;

const RevenueTable: React.FC<{ rows: any[] }> = ({ rows }) => (
    <table className="w-full"><thead className="border-b border-[var(--border-subtle)]"><tr><TH>Date</TH><TH>Reference</TH><TH>Package</TH><TH>Amount</TH><TH>Phone</TH></tr></thead>
    <tbody>{(rows || []).slice(0, 100).map((r: any, i: number) => (<tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-elevated)] transition-colors"><TD>{new Date(r.date).toLocaleDateString()}</TD><TD mono>{r.reference?.slice(0, 12) || '—'}</TD><TD>{r.package}</TD><TD>{fmtKESCents(r.amount)}</TD><TD>{r.phone}</TD></tr>))}</tbody></table>
);

const SubscribersTable: React.FC<{ rows: any[] }> = ({ rows }) => (
    <table className="w-full"><thead className="border-b border-[var(--border-subtle)]"><tr><TH>Name</TH><TH>Phone</TH><TH>Package</TH><TH>Status</TH><TH>Expires</TH></tr></thead>
    <tbody>{(rows || []).slice(0, 100).map((r: any, i: number) => (<tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-elevated)] transition-colors"><TD>{r.name || 'Anonymous'}</TD><TD mono>{r.phone || '—'}</TD><TD>{r.package}</TD><TD><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{r.status}</span></TD><TD>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—'}</TD></tr>))}</tbody></table>
);

const RoutersTable: React.FC<{ rows: any[] }> = ({ rows }) => (
    <table className="w-full"><thead className="border-b border-[var(--border-subtle)]"><tr><TH>Name</TH><TH>Host</TH><TH>Status</TH><TH>Version</TH><TH>Last Seen</TH></tr></thead>
    <tbody>{(rows || []).map((r: any, i: number) => (<tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-elevated)] transition-colors"><TD>{r.name}</TD><TD mono>{r.host}</TD><TD><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.isOnline ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{r.isOnline ? 'Online' : 'Offline'}</span></TD><TD mono>{r.version || '—'}</TD><TD>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : 'Never'}</TD></tr>))}</tbody></table>
);

const BandwidthTable: React.FC<{ rows: any[] }> = ({ rows }) => (
    <table className="w-full"><thead className="border-b border-[var(--border-subtle)]"><tr><TH>MAC</TH><TH>IP</TH><TH>Status</TH><TH>↓ Download</TH><TH>↑ Upload</TH></tr></thead>
    <tbody>{(rows || []).slice(0, 100).map((r: any, i: number) => (<tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-elevated)] transition-colors"><TD mono>{r.macAddress}</TD><TD mono>{r.ipAddress || '—'}</TD><TD><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'}`}>{r.status}</span></TD><TD>{fmtMB(r.bytesIn)}</TD><TD>{fmtMB(r.bytesOut)}</TD></tr>))}</tbody></table>
);

const PaymentsTable: React.FC<{ rows: any[] }> = ({ rows }) => (
    <table className="w-full"><thead className="border-b border-[var(--border-subtle)]"><tr><TH>Date</TH><TH>Phone</TH><TH>Package</TH><TH>Amount</TH><TH>Status</TH></tr></thead>
    <tbody>{(rows || []).slice(0, 100).map((r: any, i: number) => (<tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-elevated)] transition-colors"><TD>{new Date(r.date).toLocaleDateString()}</TD><TD mono>{r.phone || '—'}</TD><TD>{r.package}</TD><TD>{fmtKESCents(r.amount)}</TD><TD><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : r.status === 'FAILED' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>{r.status}</span></TD></tr>))}</tbody></table>
);

export default Reports;
