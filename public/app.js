let selectedPkgId = null;

function selectPackage(id, price) {
    selectedPkgId = id;
    document.getElementById('package-list').classList.add('hidden');
    document.getElementById('payment-form').classList.remove('hidden');
}

function showPackages() {
    document.getElementById('package-list').classList.remove('hidden');
    document.getElementById('payment-form').classList.add('hidden');
}

const urlParams = new URLSearchParams(window.location.search);
const mac = urlParams.get('mac') || '00:00:00:00:00:00';
const ip = urlParams.get('ip') || '';

async function initiatePayment() {
    const phone = document.getElementById('phone').value;
    if (!phone) return alert('Please enter phone number');

    document.getElementById('payment-form').classList.add('hidden');
    document.getElementById('status-spinner').classList.remove('hidden');

    try {
        const response = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                packageId: selectedPkgId,
                mac: mac, // Sent to backend
                ip: ip    // Sent to backend
            })
        });

        const data = await response.json();
        if (data.checkoutId) {
            pollStatus(data.checkoutId);
        } else {
            alert('Error initiating payment');
            showPackages();
        }
    } catch (error) {
        console.error(error);
        alert('Network error');
        showPackages();
    }
}

async function pollStatus(checkoutId) {
    // In a real system, you'd poll /api/status/:checkoutId
    // For this prototype, we'll simulate waiting and check if access is granted via auto-login
    const interval = setInterval(async () => {
        const response = await fetch(`/api/status/${checkoutId}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
            clearInterval(interval);
            // In MikroTik, we might redirect to the hotspot login URL with credentials
            // For now, inform the user
            document.body.innerHTML = `
                <div class="container">
                    <div class="glass">
                        <h2>Success!</h2>
                        <p>Access has been granted. Connecting you now...</p>
                        <button onclick="window.location.href='http://10.5.50.1/login'">Connect Now</button>
                    </div>
                </div>
            `;
        }
    }, 5000);
}
