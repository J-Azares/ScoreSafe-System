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

const authForm = document.getElementById('authorizeStudentForm');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const tempName = document.getElementById('authName').value;
        const campus = document.getElementById('authCampus').value;

        if (email === localStorage.getItem('username')) {
            alert("Error: You cannot authorize yourself as a student.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/authorize-student`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, fullName: tempName, campus })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message || "Student authorized! They can now log in using their Sorsu email.");
                authForm.reset();
                renderEnrollmentTable(); 
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            alert("Connection error.");
        }
    });
}

const addSubjectForm = document.getElementById('addSubjectForm');
if (addSubjectForm) {
    addSubjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subjectName = document.getElementById('subjectName').value;

        try {
            const res = await fetch(`${API_BASE_URL}/api/scores/add-subject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: subjectName })
            });

            const data = await res.json();

            if (res.ok) {
                alert("Subject added successfully!");
                addSubjectForm.reset();
                renderSubjectTable(); 
            } else {
                alert(data.error || "Failed to add subject.");
            }
        } catch (err) {
            console.error("Subject add error:", err);
            alert("Connection error.");
        }
    });
}

async function deleteSubject(id) {
    if (!confirm("Are you sure you want to remove this subject?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/delete-subject/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert("Subject removed.");
            renderSubjectTable();
        } else {
            const data = await res.json();
            alert(data.error || "Delete failed.");
        }
    } catch (err) {
        alert("Error connecting to server.");
    }
}

window.deleteSubject = deleteSubject;

window.addEventListener('load', () => {
    if (document.getElementById('teacherProfileForm')) {
        displayProfileInfo();
        document.getElementById('saveTeacherProfile')?.addEventListener('click', saveProfileChanges);
        
        // RESET BUTTON LOGIC FOR TEACHER
        document.getElementById('resetTeacherProfile')?.addEventListener('click', () => {
            if (confirm("Discard all unsaved changes?")) {
                displayProfileInfo();
                const fileInput = document.getElementById('teacherAvatar');
                if (fileInput) fileInput.value = "";
            }
        });
    }
    
    loadDropdowns();
    updateDashboardStats();

    if (document.getElementById('scoresTable')) renderScoresTables();
    if (document.getElementById('studentsTable')) renderActiveStudentTable(); // Updated to the new split function
    if (document.getElementById('subjectsTable')) renderSubjectTable();
    if (document.getElementById('facultyTable')) renderFacultyTable();
    if (document.getElementById('enrollmentTable')) renderEnrollmentTable(); // Added for enrollment page
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
        // FILTER: Dashboard only counts students who are APPROVED
        const approvedStudents = users.filter(u => u.role === 'student' && u.is_approved === 1);
        
        if (document.getElementById('totalRecords')) document.getElementById('totalRecords').innerText = scores.length;
        if (document.getElementById('totalStudents')) document.getElementById('totalStudents').innerText = approvedStudents.length;
        if (document.getElementById('totalSubjects')) document.getElementById('totalSubjects').innerText = subjects.length;
    } catch (e) { console.error(e); }
}

async function loadDropdowns() {
    const studentSelect = document.getElementById('studentSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    try {
        if (studentSelect) {
            const users = await fetch(`${API_BASE_URL}/api/auth/profile?all=true`).then(r => r.json());
            // DROPDOWN: Only show approved students
            const students = users.filter(u => u.role === 'student' && u.is_approved === 1);
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

// --- NEW SPLIT LOGIC FUNCTIONS ---

async function renderEnrollmentTable() {
    const tbody = document.querySelector('#enrollmentTable tbody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?all=true`);
        const users = await res.json();
        
        // SHOW: Students who signed up or authorized but NOT approved yet
        const pendingApproval = users.filter(u => u.role === 'student' && u.is_approved === 0);

        if (pendingApproval.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No pending authorizations.</td></tr>';
            return;
        }

        tbody.innerHTML = pendingApproval.map(s => `
            <tr>
                <td>
                    <span class="status-badge ${s.is_verified ? 'active' : 'pending'}">
                        ${s.is_verified ? 'Ready to Approve' : 'Authorized'}
                    </span>
                </td>
                <td>${s.username}</td>
                <td>${s.full_name}</td>
                <td>${s.campus || '---'}</td> 
                <td>
                    <button class="btn" onclick="approveStudent(${s.id})">Approve</button>
                    <button class="action-link-delete" onclick="handleRemoveStudent(${s.id}, '${s.full_name}')">Decline</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

async function renderActiveStudentTable() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return; 

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?all=true`);
        const users = await res.json();
        
        // SHOW: Only students who HAVE been approved
        const activeStudents = users.filter(u => u.role === 'student' && Number(u.is_approved) === 1);

        if (document.getElementById('totalStudentCount')) 
            document.getElementById('totalStudentCount').innerText = activeStudents.length;

        if (activeStudents.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No active students yet.</td></tr>';
            return;
        }

        tbody.innerHTML = activeStudents.map(s => `
            <tr>
        <td><span class="status-badge active">ACTIVE</span></td>
        <td>${s.username}</td>
        <td>${s.full_name}</td>
        <td>${s.campus || 'N/A'}</td>
        <td style="text-align: center;">
            <div style="display: flex; gap: 5px; justify-content: center;">
                <button class="btn-view" onclick="viewPerformance('${s.username}')">View</button>
                <button class="btn-drop" onclick="handleRemoveStudent(${s.id}, '${s.full_name}')">Drop</button>
            </div>
        </td>
    </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

async function approveStudent(id) {
    if (!confirm("Approve this student for enrollment?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/approve-student/${id}`, { method: 'POST' });
        if (res.ok) {
            alert("Student approved!");
            renderEnrollmentTable();
            updateDashboardStats();
        }
    } catch (err) { alert("Error approving student."); }
}

async function handleRemoveStudent(id, name) {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/user/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Removed successfully");
            location.reload(); 
        }
    } catch (err) { alert("Error removing user."); }
}

// --- CROPPER LOGIC ---

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

document.addEventListener('click', (e) => {
    if (e.target.closest('.filter-btn')) {
        const menu = e.target.closest('.search-container').querySelector('.filter-menu');
        menu.classList.toggle('active');
    } else {
        document.querySelectorAll('.filter-menu').forEach(m => m.classList.remove('active'));
    }
});

function applyFilter(tableId, category, value) {
    const table = document.querySelector(tableId);
    const rows = table.querySelectorAll('tbody tr:not(.empty-row)');
    
    rows.forEach(row => {
        let textToMatch = "";
        
        if (category === 'campus') textToMatch = row.children[3].innerText;
        if (category === 'role') textToMatch = row.children[2].innerText;
        if (category === 'category') textToMatch = row.children[5].innerText;
        if (category === 'reset') { row.style.display = ""; return; }

        if (value === 'all' || textToMatch.toLowerCase().includes(value.toLowerCase())) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function applyFilter(tableId, type, value) {
    const table = document.querySelector(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr:not(.empty-row)');
    
    rows.forEach(row => {
        if (type === 'reset') {
            row.style.display = '';
            return;
        }

        // Index 5 is the 'Category' column in the Scores Table
        const categoryCell = row.children[5].innerText.trim();

        if (value === 'all' || categoryCell.toLowerCase() === value.toLowerCase()) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Close the menu after clicking
    document.querySelectorAll('.filter-menu').forEach(m => m.classList.remove('active'));
}

document.querySelectorAll('.table-search').forEach(input => {
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        const tableId = this.getAttribute('data-table');
        const rows = document.querySelectorAll(`${tableId} tbody tr:not(.empty-row)`);
        
        rows.forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(value) ? "" : "none";
        });
    });
});

document.getElementById('cancelCrop')?.addEventListener('click', () => {
    cropperModal.style.display = 'none';
    avatarInput.value = ""; 
});

document.getElementById('confirmCrop')?.addEventListener('click', () => {
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });

    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        // FIELD NAME MUST MATCH: 'profile_photo'
        formData.append('profile_photo', blob, 'avatar.jpg');
        formData.append('email', localStorage.getItem('username'));

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/profile/upload-photo`, {
                method: 'POST',
                body: formData 
            });

            if (res.ok) {
                alert("Profile picture updated!");
                location.reload(); 
            } else {
                const errData = await res.json();
                alert("Server Error: " + errData.error);
            }
        } catch (err) {
            alert("Connection error to backend.");
        }
    }, 'image/jpeg', 0.9);
});

window.editScore = editScore;
window.lockScore = lockScore;
window.displayProfileInfo = displayProfileInfo;
window.saveProfileChanges = saveProfileChanges;
window.approveStudent = approveStudent;
window.handleRemoveStudent = handleRemoveStudent;