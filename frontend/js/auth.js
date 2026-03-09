document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const showMsg = (elId, text, isError = true) => {
        const el = document.getElementById(elId);
        if (el) {
            el.textContent = text;
            el.style.color = isError ? "#ef4444" : "#10b981";
        }
    };

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });

                const data = await res.json();
                if (!res.ok) return showMsg('registerMsg', data.message || 'Registration failed');

                showMsg('registerMsg', 'Account created! Redirecting...', false);
                setTimeout(() => { window.location.href = 'signin.html'; }, 2000);
            } catch (err) {
                showMsg('registerMsg', 'Connection error. Is the backend running?');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password })
                });

                const data = await res.json();
                if (!res.ok) return showMsg('loginMsg', data.message || 'Login failed');

                localStorage.setItem('role', data.role);
                window.location.href = data.role === 'teacher' ? 'teacher/dashboard.html' : 'student/dashboard.html';
            } catch (err) {
                showMsg('loginMsg', 'Server unreachable.');
            }
        });
    }
});