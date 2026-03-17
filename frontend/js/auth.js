async function handleCredentialResponse(response) {
    const loader = document.getElementById('loader');
    const googleBtn = document.getElementById('googleBtnWrapper') || document.querySelector('.g_id_signin');
    const header = document.querySelector('.auth-header');
    const loginForm = document.getElementById('loginForm');
    const footer = document.querySelector('.form-footer');
    const domainNotice = document.querySelector('.domain-notice');

    if (googleBtn) googleBtn.style.display = 'none';
    if (header) header.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (domainNotice) domainNotice.style.display = 'none';
    if (loader) loader.style.display = 'block';

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('role', data.user.role);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('fullName', data.user.full_name);
            localStorage.setItem('profilePic', data.user.profile_photo);
            localStorage.setItem('bio', data.user.bio || "");

            window.location.href = data.user.role === 'teacher' ? 'teacher/dashboard.html' : 'student/dashboard.html';
        } else {
            alert(data.error || "Authentication failed");
            location.reload(); 
        }
    } catch (err) {
        console.error("SSO Error:", err);
        alert("Server unreachable. Please check your backend.");
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const loader = document.getElementById('loader');
            const googleSignin = document.querySelector('.g_id_signin');
            const orSeparator = document.querySelector('.auth-card hr')?.parentElement;

            loginForm.style.display = 'none';
            if (googleSignin) googleSignin.style.display = 'none';
            if (orSeparator) orSeparator.style.display = 'none';
            if (loader) loader.style.display = 'block';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    alert(data.message || 'Login failed');
                    location.reload();
                    return;
                }

                localStorage.setItem('role', data.role);
                localStorage.setItem('username', email);
                localStorage.setItem('fullName', data.full_name || "User");
                localStorage.setItem('profilePic', data.profile_photo || ""); 

                window.location.href = data.role === 'teacher' ? 'teacher/dashboard.html' : 'student/dashboard.html';
            } catch (err) {
                alert('Server unreachable.');
                location.reload();
            }
        });
    }
});

window.handleCredentialResponse = handleCredentialResponse;