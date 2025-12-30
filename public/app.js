let selectedPkgId = null;
const urlParams = new URLSearchParams(window.location.search);
const mac = urlParams.get('mac') || 'NOT_DETECTED';
const ip = urlParams.get('ip') || 'STATIONARY';

// 1. Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadPackages();
    document.getElementById('device-info').innerText = `Device: ${mac} | IP: ${ip}`;
});

async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        const packages = await response.json();
        const list = document.getElementById('package-list');
        list.innerHTML = '';

        packages.forEach(pkg => {
            const card = document.createElement('div');
            card.className = 'pkg-card';
            let durationText = `${pkg.durationMinutes} min`;
            if (pkg.durationMinutes >= 43200) durationText = '1 Month';
            else if (pkg.durationMinutes >= 10080) durationText = '1 Week';
            else if (pkg.durationMinutes >= 60) durationText = `${pkg.durationMinutes / 60} Hour${pkg.durationMinutes / 60 > 1 ? 's' : ''}`;

            card.innerHTML = `
                <div class="pkg-info">
                    <h3>${pkg.name}</h3>
                    <span>${durationText} • Pay-Per-Use</span>
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
}

async function initiatePayment() {
    const phone = document.getElementById('phone').value.trim();
    if (!phone) return alert('Please enter your M-Pesa number');
    if (!selectedPkg) return alert('Please select a plan first');

    document.getElementById('main-flow').classList.add('hidden');
    document.getElementById('status-overlay').classList.remove('hidden');

    try {
        const response = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, packageId: selectedPkg.id, mac, ip })
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
            const response = await fetch(`/api/payment-status/${paymentId}`);
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

    let totalSeconds = durationMinutes * 60;
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

function formatBytes(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(0) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(0) + ' MB';
    return bytes + ' B';
}
