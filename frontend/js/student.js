let cropper;
let avatarInput;
let imageToCrop;
let cropperModal;

window.onload = () => {
    // Initialize cropper elements after DOM is ready
    avatarInput = document.getElementById('studentAvatar');
    imageToCrop = document.getElementById('imageToCrop');
    cropperModal = document.getElementById('cropperModal');

    renderStudentData(); 
    displayStudentProfile(); 
    setupCropper();

    document.getElementById('resetStudentProfile')?.addEventListener('click', () => {
        if (confirm("Discard all unsaved changes?")) {
            displayStudentProfile();
            if (avatarInput) avatarInput.value = "";
        }
    });
};

async function renderStudentData() {
    const email = localStorage.getItem('username'); 
    
    const tbody = document.querySelector('#studentScoresTable tbody') || 
                  document.querySelector('#myRecordsTable tbody');
                  
    if (!tbody || !email) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/get-records?email=${encodeURIComponent(email)}`);
        const records = await res.json();
        
        const finalizedRecords = records.filter(r => r.is_finalized === 1);

        tbody.innerHTML = '';
        if (finalizedRecords.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-info-circle" style="margin-bottom: 10px; font-size: 1.5rem; display: block; color: var(--primary-color);"></i>
                        No finalized records available yet. <br>
                        <small>Grades will appear here once officially confirmed by your instructor.</small>
                    </td>
                </tr>`;

            if (document.getElementById('studentTotalScores')) 
                document.getElementById('studentTotalScores').innerText = '0';
            if (document.getElementById('studentTotalSubjects')) 
                document.getElementById('studentTotalSubjects').innerText = '0';
            if (document.getElementById('studentAverage')) 
                document.getElementById('studentAverage').innerText = '0%';
            return;
        }

        finalizedRecords.forEach(r => {
            const tr = document.createElement('tr');
            const statusBadge = `<span class="badge" style="background: #e6f4ea; color: #1e7e34; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; border: 1px solid #1e7e34;"><i class="fas fa-check-circle"></i> OFFICIAL</span>`;

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
                <td>${r.teacher_name || 'Faculty Member'}</td> 
                <td>${statusBadge}</td>
                <td>${new Date(r.date_created).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });

        const uniqueSubs = [...new Set(finalizedRecords.map(r => r.subject_name))];
        const totalEarned = finalizedRecords.reduce((sum, r) => sum + Number(r.score), 0);
        const totalPossible = finalizedRecords.reduce((sum, r) => sum + Number(r.total_items || 0), 0);
        const average = totalPossible > 0 
            ? ((totalEarned / totalPossible) * 100).toFixed(1) 
            : 0;

        if (document.getElementById('studentTotalScores')) 
            document.getElementById('studentTotalScores').innerText = finalizedRecords.length;
        if (document.getElementById('studentTotalSubjects')) 
            document.getElementById('studentTotalSubjects').innerText = uniqueSubs.length;
        if (document.getElementById('studentAverage')) 
            document.getElementById('studentAverage').innerText = `${average}%`;

    } catch (e) { 
        console.error("Data fetch failed:", e); 
    }
}

async function displayStudentProfile() {
    const email = localStorage.getItem('username');
    console.log("Loading profile for:", email);

    const profileForm = document.getElementById('studentProfileForm');
    console.log("Form found:", profileForm); 
    if (!email || !profileForm) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?username=${email}`);
        const user = await res.json();
        console.log("User data:", user); 
        if (res.ok) {
            const nameField = document.getElementById('studentFullName');
            const emailField = document.getElementById('studentEmail');
            const bioField = document.getElementById('studentBio');
            
            console.log("Fields:", nameField, emailField, bioField); // ✅ Add this

            if (nameField) nameField.value = user.full_name || '';
            if (emailField) emailField.value = user.username || '';
            if (bioField) bioField.value = user.bio || '';

            const avatarWrapper = document.getElementById('studentAvatarPreview');
            if (avatarWrapper && user.profile_photo) {
                const src = user.profile_photo.startsWith('http') ? 
                            user.profile_photo.replace(/=s\d+-c/g, '=s0') : 
                            `${API_BASE_URL}/uploads/${user.profile_photo}`;
                avatarWrapper.innerHTML = `<img src="${src}" referrerpolicy="no-referrer" 
                    style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
            }
        }
    } catch (err) { 
        console.error("Profile load failed", err); 
    }
}

function setupCropper() {
    if (!avatarInput || !imageToCrop || !cropperModal) return;

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                cropperModal.style.display = 'flex';
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.8
                });
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('cancelCrop')?.addEventListener('click', () => {
        cropperModal.style.display = 'none';
        if (cropper) cropper.destroy();
        avatarInput.value = "";
    });

    document.getElementById('confirmCrop')?.addEventListener('click', () => {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('profile_photo', blob, 'avatar.jpg');

            const email = localStorage.getItem('username');
            if (!email) {
                alert("Session expired. Please sign in again.");
                return;
            }
            formData.append('email', email);

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/profile/upload-photo`, {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    alert("Profile picture updated!");
                    cropperModal.style.display = 'none';
                    if (cropper) cropper.destroy();
                    avatarInput.value = "";
                    displayStudentProfile();
                } else {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const errData = await res.json();
                        alert("Upload Error: " + errData.error);
                    } else {
                        const fullError = await res.text();
                        console.error("Server crashed:", fullError);
                        alert("Server Error (500): Upload failed.");
                    }
                }
            } catch (err) {
                console.error("Upload error:", err);
                alert("Connection error to backend.");
            }
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

document.getElementById('studentSearchInput')?.addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const tableId = this.getAttribute('data-table');
    const rows = document.querySelectorAll(`${tableId} tbody tr:not(.empty-row)`);
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(val) ? "" : "none");
});

document.getElementById('recordsSearch')?.addEventListener('input', function() {
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