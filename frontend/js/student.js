const API_BASE_URL = 'http://127.0.0.1:3000';
let cropper;

const avatarInput = document.getElementById('studentAvatar');
const imageToCrop = document.getElementById('imageToCrop');
const cropperModal = document.getElementById('cropperModal');

window.onload = () => {
    renderStudentData(); 
    displayStudentProfile(); 

    // Reset button functionality
    document.getElementById('resetStudentProfile')?.addEventListener('click', () => {
        if (confirm("Discard all unsaved changes?")) {
            displayStudentProfile();
            const fileInput = document.getElementById('studentAvatar');
            if (fileInput) fileInput.value = "";
        }
    });
};

async function renderStudentData() {
    // 1. We identify the specific student by their email in localStorage
    const email = localStorage.getItem('username'); 
    
    const tbody = document.querySelector('#studentScoresTable tbody') || 
                  document.querySelector('#myRecordsTable tbody');
                  
    if (!tbody || !email) return;

    try {
        // 2. We pass the email to the backend to TRIGGER the privacy filter
        const res = await fetch(`${API_BASE_URL}/api/scores/get-records?email=${encodeURIComponent(email)}`);
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

        // Dashboard Stats calculation
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
    const profileForm = document.getElementById('studentProfileForm');
    if (!email || !profileForm) return;
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
                            user.profile_photo.replace(/=s\d+-c/g, '=s0') : 
                            `${API_BASE_URL}/uploads/${user.profile_photo}`;
                avatarWrapper.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
            }
        }
    } catch (err) { console.error("Profile load failed", err); }
}

// Cropper implementation (Same as teacher side)
if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                cropperModal.style.display = 'flex';
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1 });
            };
            reader.readAsDataURL(file);
        }
    });
}

document.getElementById('cancelCrop')?.addEventListener('click', () => {
    cropperModal.style.display = 'none';
    avatarInput.value = ""; 
});

const confirmCropBtn = document.getElementById('confirmCrop');
if (confirmCropBtn) {
    confirmCropBtn.addEventListener('click', () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('profile_photo', blob, 'avatar.jpg');
            formData.append('email', localStorage.getItem('username'));
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/profile/upload-photo`, {
                    method: 'POST',
                    body: formData 
                });
                if (res.ok) {
                    alert("Updated!");
                    cropperModal.style.display = 'none';
                    avatarInput.value = ""; 
                    displayStudentProfile(); 
                } else { alert("Failed."); }
            } catch (err) { alert("Error."); }
        }, 'image/jpeg', 0.9);
    });
}

const studentProfileForm = document.getElementById('studentProfileForm');
if (studentProfileForm) {
    studentProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('studentFullName').value;
        const bio = document.getElementById('studentBio').value;
        const email = localStorage.getItem('username');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, bio, email })
            });
            if (res.ok) {
                localStorage.setItem('fullName', fullName);
                alert("Profile saved!");
                displayStudentProfile();
            }
        } catch (err) { alert("Failed."); }
    });
}

// Filter engine for Student side
function applyFilter(tableId, type, value) {
    const table = document.querySelector(tableId);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr:not(.empty-row)');
    rows.forEach(row => {
        if (type === 'reset' || value === 'all' || value === '') {
            row.style.display = '';
            return;
        }
        const categoryCell = row.children[4].innerText.trim().toLowerCase();
        if (categoryCell === value.toLowerCase()) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    document.querySelectorAll('.filter-menu').forEach(m => m.classList.remove('active'));
}

// Search and Filter UI logic
document.getElementById('studentSearchInput')?.addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const tableId = this.getAttribute('data-table');
    const rows = document.querySelectorAll(`${tableId} tbody tr:not(.empty-row)`);
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(val) ? "" : "none");
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.filter-btn')) {
        const menu = e.target.closest('.search-container').querySelector('.filter-menu');
        menu.classList.toggle('active');
    } else {
        document.querySelectorAll('.filter-menu').forEach(m => m.classList.remove('active'));
    }
});

document.querySelectorAll('.logout-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Sign out?")) {
            localStorage.clear();
            window.location.href = '../signin.html';
        }
    });
});

window.applyFilter = applyFilter;