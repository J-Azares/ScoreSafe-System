document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const confirmLogout = confirm("Are you sure you want to sign out? Any unsaved changes may be lost.");
        if (confirmLogout) {
            localStorage.clear();
            window.location.href = "../signin.html"; 
        }
    });
});

async function displayProfileInfo() {
    const nameField = document.getElementById('teacherFullName');
    const emailField = document.getElementById('teacherEmail');
    const bioField = document.getElementById('teacherBio');
    const avatarWrapper = document.getElementById('teacherAvatarPreview');

    const email = localStorage.getItem('username');
    if (!email) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?username=${email}`);
        const user = await res.json();

        if (res.ok) {
            if (nameField) nameField.value = user.full_name || '';
            if (emailField) emailField.value = user.username || '';
            if (bioField) bioField.value = user.bio || ''; 

            let picUrl = user.profile_photo;
            if (avatarWrapper && picUrl && picUrl !== "null") {
                let finalSrc;
                if (picUrl.startsWith('http')) {
                    finalSrc = picUrl.replace(/=s\d+-c/g, '=s400-c');
                } else {
                    finalSrc = `${API_BASE_URL}/uploads/${picUrl}`;
                }
                avatarWrapper.innerHTML = `<img src="${finalSrc}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
            }
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

async function saveProfileChanges(e) {
    if (e) e.preventDefault();

    const fullName = document.getElementById('teacherFullName').value;
    const bio = document.getElementById('teacherBio').value;
    const email = localStorage.getItem('username'); 

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, bio, email })
        });

        if (res.ok) {
            localStorage.setItem('fullName', fullName);
            alert("Success! Your profile has been updated.");
            displayProfileInfo(); 
        }
    } catch (err) {
        console.error("Save error:", err);
    }
}


async function renderScoresTables() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/get-records`);
        const records = await res.json();
        const tbody = document.querySelector('#scoresTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (records.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No records yet</td></tr>';
            return;
        }

        records.forEach((r) => {
            const tr = document.createElement('tr');
            const lockStatus = r.is_finalized ? '🔒' : '';
            tr.innerHTML = `
                <td>${r.full_name || 'Unknown Student'} ${lockStatus}</td> 
                <td>${r.subject_name || 'General'}</td>
                <td>${r.score}</td>
                <td>${r.total_items || '-'}</td>
                <td>
                    ${r.paper_image_url ? `<a href="${API_BASE_URL}/uploads/${r.paper_image_url}" target="_blank">View Paper</a>` : 'No Image'}
                </td>
                <td>${r.category}</td>
                <td>${new Date(r.date_created).toLocaleDateString()}</td>
                <td>
                    <button class="btn" onclick="editScore(${r.id}, ${r.is_finalized})">Edit</button>
                    <button class="btn outline" onclick="lockScore(${r.id}, ${r.is_finalized})">Finalize</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Table fetch failed", e); }
}

async function renderFacultyTable() {
    const tbody = document.querySelector('#facultyTable tbody');
    if (!tbody) return; 

    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/get-faculty`);
        const faculty = await res.json();

        if (faculty.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No faculty authorized yet.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        faculty.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${f.email}</td>
                <td>${f.campus}</td>
                <td><span class="badge ${f.is_admin ? 'admin-role' : 'teacher-role'}">
                    ${f.is_admin ? 'Admin' : 'Teacher'}
                </span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Failed to load faculty list", err); }
}

async function renderStudentTable() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?all=true`);
        const users = await res.json();
        const students = users.filter(u => u.role === 'student');

        tbody.innerHTML = '';
        if (students.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No students yet</td></tr>';
            return;
        }
        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.username}</td>
                <td>${s.full_name}</td>
                <td><button class="btn-small outline" onclick="deleteUser(${s.id})">Remove</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

async function renderSubjectTable() {
    const tbody = document.querySelector('#subjectsTable tbody');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/get-subjects`);
        const subjects = await res.json();
        tbody.innerHTML = '';
        subjects.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${s.name}</td><td><button class="btn-small outline" onclick="deleteSubject(${s.id})">Remove</button></td>`;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}


const addTeacherForm = document.getElementById('addTeacherForm');
if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newTeacherEmail').value;
        const campus = document.getElementById('campusSelect').value;
        try {
            const res = await fetch(`${API_BASE_URL}/api/scores/authorize-teacher`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, campus })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                addTeacherForm.reset();
                renderFacultyTable(); 
            } else { alert("Error: " + data.error); }
        } catch (err) { alert("Connection error."); }
    });
}

const recordForm = document.getElementById('recordScoreForm');
if (recordForm) {
    recordForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const formData = new FormData();
        const scoreInput = document.getElementById('score');
        const totalItemsInput = document.getElementById('totalItemsInput');

        if (parseInt(scoreInput.value) > parseInt(totalItemsInput.value)) {
            alert("The Total Score cannot be greater than the Total Items.");
            return;
        }
        
        formData.append('student_id', document.getElementById('studentSelect').value);
        formData.append('subject_id', document.getElementById('subjectSelect').value);
        formData.append('score', scoreInput.value);
        formData.append('category', document.getElementById('categorySelect').value);
        formData.append('total_items', totalItemsInput.value || 0);
        
        const fileInput = document.getElementById('paperFile');
        if (fileInput.files[0]) formData.append('paper_image', fileInput.files[0]);

        try {
            const response = await fetch(`${API_BASE_URL}/api/scores/upload-score`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                alert("Score Recorded!");
                recordForm.reset();
                renderScoresTables(); 
                updateDashboardStats();
            }
        } catch (err) { alert("Server error."); }
    });
}

window.addEventListener('load', () => {
    if (document.getElementById('teacherProfileForm')) {
        displayProfileInfo();
        document.getElementById('saveTeacherProfile')?.addEventListener('click', saveProfileChanges);
    }
    
    loadDropdowns();
    updateDashboardStats();

    if (document.getElementById('scoresTable')) renderScoresTables();
    if (document.getElementById('studentsTable')) renderStudentTable();
    if (document.getElementById('subjectsTable')) renderSubjectTable();
    if (document.getElementById('facultyTable')) renderFacultyTable();
});


async function editScore(id, isLocked) {
    if (isLocked) return alert("This record is finalized and cannot be edited!");
    const newScore = prompt("Enter the updated score:");
    if (!newScore) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/update-score/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_score: newScore })
        });
        if (res.ok) renderScoresTables();
    } catch (err) { console.error(err); }
}

async function lockScore(id, isLocked) {
    if (isLocked) return alert("Already finalized!");
    if (confirm("Finalize this record? This locks it from editing.")) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/scores/finalize-score/${id}`, { method: 'PUT' });
            if (res.ok) renderScoresTables();
        } catch (err) { console.error(err); }
    }
}

async function updateDashboardStats() {
    try {
        const [scores, users, subjects] = await Promise.all([
            fetch(`${API_BASE_URL}/api/scores/get-records`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/auth/profile?all=true`).then(r => r.json()),
            fetch(`${API_BASE_URL}/api/scores/get-subjects`).then(r => r.json())
        ]);
        const students = users.filter(u => u.role === 'student');
        if (document.getElementById('totalRecords')) document.getElementById('totalRecords').innerText = scores.length;
        if (document.getElementById('totalStudents')) document.getElementById('totalStudents').innerText = students.length;
        if (document.getElementById('totalSubjects')) document.getElementById('totalSubjects').innerText = subjects.length;
    } catch (e) { console.error(e); }
}

async function loadDropdowns() {
    const studentSelect = document.getElementById('studentSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    try {
        if (studentSelect) {
            const users = await fetch(`${API_BASE_URL}/api/auth/profile?all=true`).then(r => r.json());
            const students = users.filter(u => u.role === 'student');
            studentSelect.innerHTML = '<option value="">-- Select Student --</option>' + 
                students.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
        }
        if (subjectSelect) {
            const subjects = await fetch(`${API_BASE_URL}/api/scores/get-subjects`).then(r => r.json());
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' + 
                subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (e) { console.error(e); }
}

let cropper;
const avatarInput = document.getElementById('teacherAvatar');
const cropperModal = document.getElementById('cropperModal');
const imageToCrop = document.getElementById('imageToCrop');

avatarInput?.addEventListener('change', function(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(event) {
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
        reader.readAsDataURL(files[0]);
    }
});

document.getElementById('cancelCrop')?.addEventListener('click', () => {
    cropperModal.style.display = 'none';
    avatarInput.value = ""; 
});

document.getElementById('confirmCrop')?.addEventListener('click', () => {
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
        width: 400,
        height: 400
    });

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
                alert("Profile picture updated!");
                cropperModal.style.display = 'none';
                avatarInput.value = ""; 
                displayProfileInfo(); 
            } else {
                alert("Failed to upload image.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Server connection error.");
        }
    }, 'image/jpeg', 0.9); 
});

window.editScore = editScore;
window.lockScore = lockScore;
window.displayProfileInfo = displayProfileInfo;
window.saveProfileChanges = saveProfileChanges;