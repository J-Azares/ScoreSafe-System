const API_BASE_URL = 'http://127.0.0.1:3000';

async function renderStudentData() {
    const email = localStorage.getItem('username');
    
    const tbody = document.querySelector('#studentScoresTable tbody') || 
                  document.querySelector('#myRecordsTable tbody');
                  
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/get-records?email=${email}`);
        const records = await res.json();
        
        tbody.innerHTML = '';
        if (records.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No records yet</td></tr>';
            return;
        }

        records.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.subject_name || 'General'}</td>
                <td><strong>${r.score}</strong></td>
                <td>${r.total_items || '-'}</td>
                <td>
                    ${r.paper_image_url ? 
                        `<a href="${API_BASE_URL}/uploads/${r.paper_image_url}" target="_blank" class="view-link">View Paper</a>` : 
                        'No Image'}
                </td>
                <td>${r.category}</td>
                <td>${new Date(r.date_created).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });

        const totalScoresEl = document.getElementById('studentTotalScores');
        const totalSubsEl = document.getElementById('studentTotalSubjects');

        if (totalScoresEl) totalScoresEl.innerText = records.length;
        if (totalSubsEl) {
            const uniqueSubs = [...new Set(records.map(r => r.subject_name))];
            totalSubsEl.innerText = uniqueSubs.length;
        }
    } catch (e) { 
        console.error("Data fetch failed:", e); 
    }
}

async function displayStudentProfile() {
    const email = localStorage.getItem('username');
    if (!email || !document.getElementById('studentProfileForm')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?username=${email}`);
        const user = await res.json();

        if (res.ok) {
            document.getElementById('studentFullName').value = user.full_name || '';
            document.getElementById('studentEmail').value = user.username || '';
            document.getElementById('studentBio').value = user.bio || '';
            
            const avatarWrapper = document.getElementById('studentAvatarPreview');
            if (avatarWrapper && user.profile_photo) {
                const src = user.profile_photo.startsWith('http') ? 
                            user.profile_photo : `${API_BASE_URL}/uploads/${user.profile_photo}`;
                avatarWrapper.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
            }
        }
    } catch (err) { console.error("Profile load failed", err); }
}

document.querySelectorAll('.logout-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to sign out?")) {
            localStorage.clear();
            window.location.href = '../signin.html';
        }
    });
});

window.onload = () => {
    renderStudentData();
    displayStudentProfile();
};