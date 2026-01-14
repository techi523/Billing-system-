async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.querySelector('button');

    if (!email || !password) return alert('Please fill in all fields');

    btn.disabled = true;
    btn.innerText = 'Authenticating...';

    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect based on role
            if (data.user.role === 'SUPER_ADMIN' || data.user.role === 'TENANT_ADMIN') {
                window.location.href = '/admin.html';
            } else if (data.user.role === 'AGENT') {
                window.location.href = '/agent.html';
            }
        } else {
            alert(data.error || 'Login failed');
            btn.disabled = false;
            btn.innerText = 'Sign In to Dashboard';
        }
    } catch (error) {
        alert('Network error. Please try again.');
        btn.disabled = false;
        btn.innerText = 'Sign In to Dashboard';
    }
}
