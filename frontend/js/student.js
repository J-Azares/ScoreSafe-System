const API_BASE_URL = 'http://127.0.0.1:3000';
let cropper;

const avatarInput = document.getElementById('studentAvatar');
const imageToCrop = document.getElementById('imageToCrop');
const cropperModal = document.getElementById('cropperModal');

window.onload = () => {
    renderStudentData(); 
    displayStudentProfile(); 
};

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

if (avatarInput) {
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
                    viewMode: 1
                });
            };
            reader.readAsDataURL(file);
        }
    });
}

const confirmCropBtn = document.getElementById('confirmCrop');
if (confirmCropBtn) {
    confirmCropBtn.addEventListener('click', () => {
        const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
        const croppedImageData = canvas.toDataURL('image/jpeg');
        
        document.getElementById('studentAvatarPreview').innerHTML = `<img src="${croppedImageData}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
        localStorage.setItem('tempPhoto', croppedImageData);
        cropperModal.style.display = 'none';
    });
}

const studentProfileForm = document.getElementById('studentProfileForm');
if (studentProfileForm) {
    studentProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('studentFullName').value;
        const bio = document.getElementById('studentBio').value;
        const email = localStorage.getItem('username');
        const photoData = localStorage.getItem('tempPhoto');

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, bio, email, photo: photoData })
            });

            if (res.ok) {
                localStorage.setItem('fullName', fullName);
                if (photoData) localStorage.setItem('profilePic', photoData);
                alert("Profile updated successfully!");
            }
        } catch (err) {
            alert("Failed to update profile.");
        }
    });
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