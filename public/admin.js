let token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

let currentSection = 'dashboard';
let cachedPackages = [];
let cachedRouters = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initial Data Fetch
    refreshAll();

    // Auto Refresh Dashboard
    setInterval(() => {
        if (currentSection === 'dashboard') loadStats();
    }, 10000);
});

async function refreshAll() {
    await loadStats();
    await loadRouters();
    await loadPackages();
    await loadSubscribers();
    await loadVouchers();
    await loadInsights();
    await loadRecentPayments();
}

// --- CORE UI LOGIC ---

function switchSection(id, element) {
    currentSection = id;
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${id}-section`).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (element) element.classList.add('active');

    document.getElementById('section-title').innerText = id.charAt(0).toUpperCase() + id.slice(1);

    // Refresh the specific view if needed
    if (id === 'revenue') loadRevenueReport();
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';

    // Populate dropdowns in modals if needed
    if (id === 'subscriber-modal') {
        populateDropdown('sub-package-select', cachedPackages.filter(p => p.type === 'ISP'));
        populateDropdown('sub-router-select', cachedRouters);
    } else if (id === 'voucher-modal') {
        populateDropdown('voucher-package-select', cachedPackages.filter(p => p.type === 'HOTSPOT'));
    }
}

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

function populateDropdown(id, items) {
    const el = document.getElementById(id);
    el.innerHTML = items.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = type === 'success' ? '#1e293b' : '#ef4444';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- API FETCHERS ---

async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    const response = await fetch(`/api/v1/admin${endpoint}`, { ...options, headers });
    if (response.status === 401) logout();
    return await response.json();
}

async function loadStats() {
    try {
        const stats = await apiFetch('/stats');
        document.getElementById('stat-revenue').innerText = `KES ${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('stat-sessions').innerText = stats.activeSessions;
        document.getElementById('stat-subscribers').innerText = stats.totalSubscribers;
        document.getElementById('stat-vouchers').innerText = stats.voucherSales;

        // Progress bar logic
        let progress = 20;
        if (cachedRouters.length > 0) progress += 20;
        if (cachedPackages.length > 0) progress += 20;
        if (stats.totalSubscribers > 0 || stats.voucherSales > 0) progress += 40;

        document.getElementById('setup-progress-label').innerText = `${progress}% Complete`;
        document.getElementById('setup-progress-bar').style.width = `${progress}%`;
    } catch (e) { }
}

async function loadRecentPayments() {
    const payments = await apiFetch('/reports/revenue'); // Gets last payments by default
    const tbody = document.querySelector('#recent-payments-table tbody');
    tbody.innerHTML = payments.slice(0, 5).map(p => `
        <tr>
            <td>${new Date(p.createdAt).toLocaleTimeString()}</td>
            <td>${p.phoneNumber}</td>
            <td>${p.package?.name || '-'}</td>
            <td>KES ${p.amount}</td>
            <td><span class="status-pill pill-success">SUCCESS</span></td>
        </tr>
    `).join('');
}

async function loadInsights() {
    try {
        const data = await apiFetch('/insights');
        document.getElementById('ai-insight-text').innerText = data.recommendation;
        document.getElementById('ai-top-plan').innerText = data.topPackage;
    } catch (e) { }
}

// --- CRUD OPERATIONS ---

// Routers
async function loadRouters() {
    cachedRouters = await apiFetch('/routers');
    const tbody = document.querySelector('#routers-table tbody');
    tbody.innerHTML = cachedRouters.map(r => `
        <tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.host}</td>
            <td>${r.username}</td>
            <td><span class="status-pill pill-success">ONLINE</span></td>
            <td><button class="btn btn-ghost" onclick="deleteItem('router', '${r.id}')">Remove</button></td>
        </tr>
    `).join('');
}

async function saveRouter(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    await apiFetch('/routers', { method: 'POST', body: JSON.stringify(data) });
    closeModal();
    showToast('Router added successfully');
    loadRouters();
}

// Packages
async function loadPackages() {
    cachedPackages = await apiFetch('/packages');
    const tbody = document.querySelector('#packages-table tbody');
    tbody.innerHTML = cachedPackages.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.type}</td>
            <td>KES ${p.price}</td>
            <td>${p.durationMinutes}m / ${p.dataLimitMB || '∞'} MB</td>
            <td><span class="status-pill pill-success">ACTIVE</span></td>
            <td><button class="btn btn-ghost">Edit</button></td>
        </tr>
    `).join('');
}

async function savePackage(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    await apiFetch('/packages', { method: 'POST', body: JSON.stringify(data) });
    closeModal();
    showToast('Billing plan created');
    loadPackages();
}

// Subscribers
async function loadSubscribers() {
    const subs = await apiFetch('/subscribers');
    const tbody = document.querySelector('#subscribers-table tbody');
    tbody.innerHTML = subs.map(s => `
        <tr>
            <td><strong>${s.name}</strong></td>
            <td><code>${s.pppoeUsername}</code></td>
            <td>${s.packageId || 'Custom'}</td>
            <td>${new Date(s.expiryDate).toLocaleDateString()}</td>
            <td><span class="status-pill ${new Date(s.expiryDate) > new Date() ? 'pill-success' : 'pill-failed'}">${new Date(s.expiryDate) > new Date() ? 'ACTIVE' : 'EXPIRED'}</span></td>
            <td><button class="btn btn-ghost">Recharge</button></td>
        </tr>
    `).join('');
}

async function saveSubscriber(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    await apiFetch('/subscribers', { method: 'POST', body: JSON.stringify(data) });
    closeModal();
    showToast('Subscriber registered and provisioned');
    loadSubscribers();
}

// Vouchers
async function loadVouchers() {
    const vouchers = await apiFetch('/vouchers');
    const tbody = document.querySelector('#vouchers-table tbody');
    tbody.innerHTML = vouchers.map(v => `
        <tr>
            <td><code>${v.code}</code></td>
            <td>${v.package?.name || '-'}</td>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>${v.usedAt ? new Date(v.usedAt).toLocaleString() : '-'}</td>
            <td><span class="status-pill ${v.status === 'ACTIVE' ? 'pill-success' : 'pill-pending'}">${v.status}</span></td>
        </tr>
    `).join('');
}

async function saveVouchers(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    await apiFetch('/vouchers', { method: 'POST', body: JSON.stringify(data) });
    closeModal();
    showToast('Voucher batch generated');
    loadVouchers();
}

// --- REPORTING ---

async function loadRevenueReport() {
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    const query = (start && end) ? `?start=${start}&end=${end}` : '';

    const report = await apiFetch(`/reports/revenue${query}`);
    const tbody = document.querySelector('#revenue-report-table tbody');
    tbody.innerHTML = report.map(p => `
        <tr>
            <td>${new Date(p.createdAt).toLocaleString()}</td>
            <td><code>${p.mpesaReceiptNumber || 'INTERNAL'}</code></td>
            <td>${p.phoneNumber}</td>
            <td>${p.package?.name || '-'}</td>
            <td><strong>KES ${p.amount}</strong></td>
        </tr>
    `).join('');
}

function exportReport() {
    const url = `/api/v1/admin/reports/export?token=${token}`;
    window.location.href = url;
}

function logout() {
    localStorage.clear();
    window.location.href = '/login.html';
}
