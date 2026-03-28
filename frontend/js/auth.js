async function handleCredentialResponse(response) {
    const loader = document.getElementById('loader');
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) loginForm.style.display = 'none';
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
            localStorage.setItem('userId', data.user.id);
            
            window.location.href = data.user.role === 'teacher' ? 'teacher/dashboard.html' : 'student/dashboard.html';
        } else {
            alert(data.error || "Login Failed");
            location.reload();
        }
    } catch (err) {
        console.error("Backend Error:", err);
        alert("Server unreachable. Please check Port 3000.");
        location.reload();
    }
}

window.handleCredentialResponse = handleCredentialResponse;