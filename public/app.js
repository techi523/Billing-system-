let selectedPkgId = null;
const urlParams = new URLSearchParams(window.location.search);
const mac = urlParams.get('mac') || 'NOT_DETECTED';
const ip = urlParams.get('ip') || 'STATIONARY';
const routerId = urlParams.get('routerId') || '';
const tenantId = urlParams.get('tenantId') || 'demo';

// 1. Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadPackages();
    document.getElementById('device-info').innerText = `DEVICE ID: ${mac}`;
});

async function loadConfig() {
    try {
        const response = await fetch(`/api/v1/portal/${tenantId}/config`);
        const config = await response.json();

        // Update Branding
        document.title = `${config.name} | powered by SurfBill`;
        document.getElementById('isp-name').innerText = config.name.toUpperCase();
        if (config.logoUrl) {
            document.getElementById('logo').src = config.logoUrl;
        }
        if (config.primaryColor) {
            document.documentElement.style.setProperty('--primary', config.primaryColor);
        }
    } catch (e) {
        console.error('Failed to load portal config');
    }
}

async function loadPackages() {
    try {
        const response = await fetch(`/api/v1/portal/${tenantId}/packages`);
        const packages = await response.json();
        const list = document.getElementById('package-list');
        list.innerHTML = '';

        // AI-Based Recommendation Logic (Simple)
        const hour = new Date().getHours();
        let recommendedId = null;

        // Suggest night plans if late, or day plans if morning
        if (hour >= 22 || hour <= 5) {
            const nightPlan = packages.find(p => p.name.toLowerCase().includes('night'));
            if (nightPlan) recommendedId = nightPlan.id;
        } else {
            // Otherwise suggest the "Best Value" (middle price)
            const sortedByPrice = [...packages].sort((a, b) => a.price - b.price);
            if (sortedByPrice.length > 2) recommendedId = sortedByPrice[1].id;
        }

        packages.forEach(pkg => {
            const card = document.createElement('div');
            card.className = 'pkg-card';
            if (pkg.id === recommendedId) card.classList.add('recommended');

            let durationText = `${pkg.durationMinutes} min`;
            if (pkg.durationMinutes >= 43200) durationText = '1 Month';
            else if (pkg.durationMinutes >= 10080) durationText = '1 Week';
            else if (pkg.durationMinutes >= 60) durationText = `${pkg.durationMinutes / 60} Hour${pkg.durationMinutes / 60 > 1 ? 's' : ''}`;

            card.innerHTML = `
                <div class="pkg-info">
                    <div style="display:flex; align-items:center; gap:0.5rem">
                        <h3>${pkg.name}</h3>
                        ${pkg.id === recommendedId ? '<span class="badge">AI RECOMMENDED</span>' : ''}
                    </div>
                    <span>${durationText} • ${pkg.type}</span>
                </div>
                <div class="pkg-price">KES ${pkg.price}</div>
            `;
            card.onclick = () => selectPackage(pkg, card);
            list.appendChild(card);
        });
    } catch (e) {
        alert('Failed to load packages. Please refresh.');
    }
}

let selectedPkg = null;
function selectPackage(pkg, element) {
    selectedPkg = pkg;
    document.querySelectorAll('.pkg-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('pay-btn').disabled = false;

    // Smooth scroll to payment section on mobile
    if (window.innerWidth < 768) {
        document.getElementById('mpesa-tab').scrollIntoView({ behavior: 'smooth' });
    }
}

async function initiatePayment() {
    const phone = document.getElementById('phone').value.trim();
    if (!phone) return alert('Please enter your M-Pesa number');
    if (!selectedPkg) return alert('Please select a plan first');

    document.getElementById('main-flow').classList.add('hidden');
    document.getElementById('status-overlay').classList.remove('hidden');

    try {
        const response = await fetch(`/api/v1/portal/${tenantId}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, packageId: selectedPkg.id, mac, ip, routerId })
        });

        const data = await response.json();
        if (data.paymentId) {
            startPolling(data.paymentId);
        } else {
            throw new Error(data.error || 'Payment initiation failed');
        }
    } catch (e) {
        alert(e.message);
        document.getElementById('main-flow').classList.remove('hidden');
        document.getElementById('status-overlay').classList.add('hidden');
    }
}

async function redeemVoucher() {
    const code = document.getElementById('voucher-code').value.trim();
    if (!code) return alert('Please enter a voucher code');

    try {
        const response = await fetch(`/api/v1/portal/${tenantId}/voucher/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, mac, ip, routerId })
        });

        const data = await response.json();
        if (data.session) {
            showSuccess(selectedPkg ? selectedPkg.durationMinutes : 60);
        } else {
            throw new Error(data.error || 'Invalid voucher');
        }
    } catch (e) {
        alert(e.message);
    }
}

function startPolling(paymentId) {
    let seconds = 60;
    const countdown = document.getElementById('countdown');

    const timer = setInterval(() => {
        seconds--;
        countdown.innerText = `${seconds}s`;
        if (seconds <= 0) clearInterval(timer);
    }, 1000);

    const poll = setInterval(async () => {
        try {
            const response = await fetch(`/api/v1/portal/payment-status/${paymentId}`);
            const data = await response.json();

            if (data.status === 'SUCCESS') {
                clearInterval(poll);
                clearInterval(timer);
                showSuccess(selectedPkg.durationMinutes);
            } else if (data.status === 'FAILED') {
                clearInterval(poll);
                clearInterval(timer);
                alert('Payment failed or cancelled. Please try again.');
                location.reload();
            }
        } catch (e) { }
    }, 3000);
}

function showSuccess(durationMinutes) {
    document.getElementById('status-overlay').classList.add('hidden');
    document.getElementById('success-overlay').classList.remove('hidden');

    let totalSeconds = (durationMinutes || 60) * 60;
    const display = document.getElementById('session-timer');

    const timer = setInterval(() => {
        totalSeconds--;
        if (totalSeconds <= 0) {
            clearInterval(timer);
            display.innerText = "00:00:00";
            return;
        }

        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        display.innerText = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}
