(function() {
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const path = window.location.pathname;

    if (!username || !role) {
        window.location.href = '../signin.html';
        return;
    }

    if (path.includes('/teacher/') && role !== 'teacher') {
        alert("Access Denied: Teachers only!");
        window.location.href = '../student/dashboard.html';
    }

    if (path.includes('/student/') && role !== 'student') {
        window.location.href = '../teacher/dashboard.html';
    }
})();