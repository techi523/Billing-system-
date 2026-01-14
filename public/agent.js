let token = localStorage.getItem('agentToken');

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.token && data.user.role === 'AGENT') {
        token = data.token;
        localStorage.setItem('agentToken', token);
        initDashboard();
    } else {
        alert('Login failed. Please check credentials or role.');
    }
}

if (token) initDashboard();

async function initDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadStats();
    loadInventory();
}

async function loadStats() {
    const res = await fetch('/api/v1/agent/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await res.json();
    document.getElementById('balance').innerText = stats.balance.toFixed(2);
    document.getElementById('total-sales').innerText = stats.totalSales;
}

async function loadInventory() {
    const res = await fetch('/api/v1/agent/vouchers/available', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const vouchers = await res.json();
    const list = document.getElementById('available-list');
    list.innerHTML = '';

    vouchers.forEach(v => {
        const card = document.createElement('div');
        card.className = 'voucher-card';
        card.innerHTML = `
            <div>
                <strong>${v.code}</strong><br>
                <small>${v.package.name} - KES ${v.package.price}</small>
            </div>
            <button class="btn-primary" style="padding: 0.5rem 1rem; width: auto;" onclick="sell('${v.id}')">SELL</button>
        `;
        list.appendChild(card);
    });
}

async function sell(id) {
    if (!confirm('Confirm sale? You will earn commission upon confirmation.')) return;

    const res = await fetch(`/api/v1/agent/vouchers/${id}/sell`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
        alert(`Success! Code: ${data.voucher.code}`);
        loadStats();
        loadInventory();
    } else {
        alert(data.error);
    }
}

function showTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'inventory') {
        document.getElementById('inventory-tab').classList.remove('hidden');
        document.getElementById('history-tab').classList.add('hidden');
    } else {
        document.getElementById('inventory-tab').classList.add('hidden');
        document.getElementById('history-tab').classList.remove('hidden');
        loadHistory();
    }
}

async function loadHistory() {
    const res = await fetch('/api/v1/agent/history', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const history = await res.json();
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    history.forEach(v => {
        const card = document.createElement('div');
        card.className = 'voucher-card';
        card.innerHTML = `
            <div>
                <strong>${v.code}</strong><br>
                <small>${new Date(v.usedAt).toLocaleString()}</small>
            </div>
            <div style="color: var(--accent); font-weight: 800;">KES ${v.package.price}</div>
        `;
        list.appendChild(card);
    });
}
