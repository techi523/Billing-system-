let token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    loadPackages();
    loadRouters();
    loadSubscribers();
    loadInsights();
});

async function initDashboard() {
    try {
        const res = await fetch('/api/v1/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await res.json();

        document.getElementById('total-revenue').innerText = `KES ${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('active-users').innerText = stats.activeSessions;
        document.getElementById('total-subs').innerText = stats.totalSubscribers;

        // Setup Progress Logic
        updateSetupProgress(stats);
    } catch (e) {
        console.error('Stats load failed');
    }
}

function updateSetupProgress(stats) {
    let progress = 20; // Default if logged in
    if (stats.totalSubscribers > 0 || stats.activeSessions > 0) progress += 40;
    // ... logic for router count etc
    document.getElementById('setup-bar').style.width = `${progress}%`;
    document.getElementById('setup-text').innerText = `${progress}% Configured`;
}

async function loadInsights() {
    try {
        const res = await fetch('/api/v1/admin/insights', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        document.getElementById('insight-box').innerHTML = `
            <p><strong>Top Plan:</strong> ${data.topPackage}</p>
            <p class="muted">${data.recommendation}</p>
        `;
    } catch (e) { }
}

async function exportReport() {
    window.open('/api/v1/admin/reports/export?token=' + token, '_blank');
}

// --- Package Management ---
async function loadPackages() {
    const res = await fetch('/api/v1/admin/packages', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const list = document.getElementById('pkg-list');
    list.innerHTML = data.map(pkg => `
        <div class="list-item">
            <span>${pkg.name} (${pkg.type})</span>
            <span>KES ${pkg.price}</span>
            <button onclick="editPkg('${pkg.id}')">Edit</button>
        </div>
    `).join('');
}

async function createPackage() {
    const name = prompt('Package Name:');
    const price = prompt('Price:');
    const type = prompt('Type (HOTSPOT or ISP):', 'HOTSPOT');

    await fetch('/api/v1/admin/packages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, price, type })
    });
    loadPackages();
}

// --- Navigation ---
function showTab(tabname) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(`${tabname}-tab`).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Wizard Logic
function nextWizard(step) {
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('hidden'));
    document.getElementById(`wizard-step-${step}`).classList.remove('hidden');
}
