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
            tbody.innerHTML = '<tr class="empty-row"><td colspan="10" style="text-align:center; padding:30px;">No records yet</td></tr>';
            return;
        }

        records.forEach((r) => {
            const tr = document.createElement('tr');
            
            const lockStatus = r.is_finalized ? '<i class="fas fa-lock" style="color: #888; margin-left: 5px;" title="Finalized"></i>' : '';
            
            const statusBadge = r.is_finalized 
                ? `<span class="badge" style="background: #e6f4ea; color: #1e7e34; border: 1px solid #c3e6cb;"><i class="fas fa-eye"></i> PUBLISHED</span>`
                : `<span class="badge" style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;"><i class="fas fa-eye-slash"></i> DRAFT (HIDDEN)</span>`;

            tr.innerHTML = `
                <td>${r.full_name || 'Unknown Student'} ${lockStatus}</td> 
                <td>${r.subject_name || 'General'}</td>
                <td>${r.score}</td>
                <td>${r.total_items || '-'}</td>
                <td>
                    ${r.paper_image_url ? `<a href="${API_BASE_URL}/uploads/${r.paper_image_url}" target="_blank" class="view-link">View Paper</a>` : 'No Image'}
                </td>
                <td>${r.category}</td>
                <td>${r.teacher_name || 'Admin'}</td> 
                <td>${statusBadge}</td>
                <td>${new Date(r.date_created).toLocaleDateString()}</td>
                <td>
    <div style="display: flex; gap: 8px; justify-content: center; align-items: center; white-space: nowrap;">
        <button class="btn" style="padding: 6px 14px; font-size: 0.85rem; min-width: 70px;"
            onclick="editScore(${r.id}, ${r.is_finalized})">
            <i class="fas fa-pen"></i> Edit
        </button>
        <button class="btn outline" style="padding: 6px 14px; font-size: 0.85rem; min-width: 80px;"
            onclick="lockScore(${r.id}, ${r.is_finalized})">
            <i class="fas fa-lock"></i> Finalize
        </button>
    </div>
</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Table fetch failed", e); }
}

async function renderFacultyTable() {
    const tbody = document.querySelector('#facultyTable tbody');
    if (!tbody) return;

    const requesterEmail = localStorage.getItem('username');

    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/get-faculty`);
        const faculty = await res.json();

        const me = faculty.find(f => f.email === requesterEmail);
        const isAdmin = me?.is_admin === 1;

        localStorage.setItem('isAdmin', isAdmin ? '1' : '0');

        const approved = faculty.filter(f => !f.is_pending);

        if (approved.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No faculty authorized yet.</td></tr>';
        } else {
            tbody.innerHTML = '';
            approved.forEach(f => {
                const isSelf = f.email === requesterEmail;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${f.email} ${isSelf ? '<span style="font-size:0.7rem;color:#888;">(you)</span>' : ''}</td>
                    <td>${f.campus}</td>
                    <td>
                        <span style="background:${f.is_admin ? '#fef3c7' : '#e0f2fe'};
                                     color:${f.is_admin ? '#92400e' : '#0369a1'};
                                     padding: 4px 10px; border-radius: 20px;
                                     font-size: 0.75rem; font-weight: bold;">
                            ${f.is_admin ? 'ADMIN' : 'TEACHER'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                            ${isAdmin && !isSelf ? `
                                ${!f.is_admin ? `
                                    <button class="btn" style="padding: 6px 14px; font-size: 0.85rem;"
                                        onclick="promoteToAdmin('${f.email}')">
                                        <i class="fas fa-shield-alt"></i> Promote
                                    </button>
                                ` : `
                                    <button class="btn outline" style="padding: 6px 14px; font-size: 0.85rem;"
                                        onclick="demoteToTeacher('${f.email}')">
                                        <i class="fas fa-user"></i> Demote
                                    </button>
                                `}
                                <button class="btn danger" style="padding: 6px 14px; font-size: 0.85rem;"
                                    onclick="removeFaculty('${f.email}')">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            ` : !isAdmin && !f.is_admin && !isSelf ? `
                                <button class="btn danger" style="padding: 6px 14px; font-size: 0.85rem;"
                                    onclick="removeFaculty('${f.email}')">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            ` : `
                                <span style="color: #aaa; font-size: 0.8rem;">—</span>
                            `}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        if (isAdmin) {
            renderPendingRequests(faculty.filter(f => f.is_pending));
        }

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
    tr.innerHTML = `
        <td>${s.name}</td>
        <td style="text-align: center;">
            <button class="btn danger" style="padding: 6px 12px; font-size: 0.85rem;"
                onclick="deleteSubject(${s.id})">
                <i class="fas fa-trash"></i> Remove
            </button>
        </td>
    `;
    tbody.appendChild(tr);
});
    } catch (e) { console.error(e); }
}

async function renderPendingRequests(pending) {
    let section = document.getElementById('pendingRequestsSection');
    if (!section) {
        section = document.createElement('section');
        section.id = 'pendingRequestsSection';
        section.className = 'card table-section';
        section.style.marginTop = '20px';
        section.innerHTML = `
            <div class="table-header">
                <h3><i class="fas fa-clock icon-label"></i> Pending Teacher Requests</h3>
            </div>
            <div class="table-wrapper">
                <table id="pendingTable">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Campus</th>
                            <th>Requested By</th>
                            <th style="text-align:center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        document.querySelector('main.container').appendChild(section);
    }

    const tbody = section.querySelector('tbody');

    if (pending.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    tbody.innerHTML = pending.map(p => `
        <tr>
            <td>${p.email}</td>
            <td>${p.campus}</td>
            <td>${p.requested_by || '—'}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="btn" style="padding: 6px 14px; font-size: 0.85rem;"
                        onclick="approveFacultyRequest('${p.email}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn danger" style="padding: 6px 14px; font-size: 0.85rem;"
                        onclick="declineFacultyRequest('${p.email}')">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function approveFacultyRequest(email) {
    const requesterEmail = localStorage.getItem('username');
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/approve-faculty-request`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, requesterEmail })
        });
        const data = await res.json();
        if (res.ok) { alert("Request approved!"); renderFacultyTable(); }
        else alert(data.error);
    } catch (err) { alert("Connection error."); }
}

async function declineFacultyRequest(email) {
    const requesterEmail = localStorage.getItem('username');
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/decline-faculty-request`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, requesterEmail })
        });
        const data = await res.json();
        if (res.ok) { alert("Request declined."); renderFacultyTable(); }
        else alert(data.error);
    } catch (err) { alert("Connection error."); }
}

const addTeacherForm = document.getElementById('addTeacherForm');
if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newTeacherEmail').value;
        const campus = document.getElementById('campusSelect').value;
        const requesterEmail = localStorage.getItem('username');
        try {
            const res = await fetch(`${API_BASE_URL}/api/scores/request-authorize-teacher`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, campus, requesterEmail })
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

        const scoreInput = document.getElementById('score');
        const totalItemsInput = document.getElementById('totalItemsInput');
        const studentId = document.getElementById('studentSelect').value;
        const subjectId = document.getElementById('subjectSelect').value;
        const teacherId = localStorage.getItem('userId'); 

        if (!teacherId) {
            alert("Error: Teacher session not found. Please log in again.");
            return;
        }

        if (!studentId) {
            alert("Please select a student.");
            return;
        }

        if (!subjectId) {
            alert("Please select a subject.");
            return;
        }

        if (parseInt(scoreInput.value) > parseInt(totalItemsInput.value)) {
            alert("The Total Score cannot be greater than the Total Items.");
            return;
        }

        const formData = new FormData();
        formData.append('recorded_by_id', teacherId);
        formData.append('student_id', studentId);
        formData.append('subject_id', subjectId);
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
            
            const result = await response.json();

            if (response.ok) {
                alert("Score Recorded! It will be visible to the student once finalized.");
                recordForm.reset();
                document.getElementById('studentSearch').value = "";
                document.getElementById('subjectSearch').value = "";
                renderScoresTables(); 
                updateDashboardStats();
            } else {
                alert("Error: " + (result.error || "Failed to save record"));
            }
        } catch (err) { 
            console.error("Submission error:", err);
            alert("Server connection error."); 
        }
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
            } else {
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
    if (document.getElementById('studentsTable')) renderActiveStudentTable();
    if (document.getElementById('subjectsTable')) renderSubjectTable();
    if (document.getElementById('facultyTable')) renderFacultyTable();
    if (document.getElementById('enrollmentTable')) renderEnrollmentTable(); 
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
    if (confirm("Finalize this record? This will publish the grade to the student's dashboard.")) {
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
            const activeStudents = users.filter(u => u.role === 'student' && Number(u.is_approved) === 1);
            studentSelect.innerHTML = '<option value="" disabled selected>-- Results --</option>' + 
                activeStudents.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
        }

        if (subjectSelect) {
            const subjects = await fetch(`${API_BASE_URL}/api/scores/get-subjects`).then(r => r.json());
            subjectSelect.innerHTML = '<option value="" disabled selected>-- Results --</option>' + 
                subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
    } catch (e) { 
        console.error("Error loading searchable data:", e); 
    }

    setupSearchableDropdown('studentSearch', 'studentSelect');
    setupSearchableDropdown('subjectSearch', 'subjectSelect');
}


async function renderEnrollmentTable() {
    const tbody = document.querySelector('#enrollmentTable tbody');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile?all=true`);
        const users = await res.json();
        
        const pendingApproval = users.filter(u => u.role === 'student' && u.is_approved === 0);

        if (pendingApproval.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No pending authorizations.</td></tr>';
            return;
        }

tbody.innerHTML = pendingApproval.map(s => `
    <tr>
        <td>
            <span class="status-badge ${s.is_verified ? 'active' : 'pending'}">
                ${s.is_verified ? 'Pending Approval' : 'Authorized'}
            </span>
        </td>
        <td>${s.username}</td>
        <td>${s.full_name}</td>
        <td>${s.campus || '---'}</td>
        <td>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn" style="padding: 6px 12px; font-size: 0.85rem;"
                    onclick="approveStudent(${s.id})">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn danger" style="padding: 6px 12px; font-size: 0.85rem;"
                    onclick="handleRemoveStudent(${s.id}, '${s.full_name}')">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
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
        
        const activeStudents = users.filter(u => u.role === 'student' && Number(u.is_approved) === 1);

        const today = new Date().toDateString();
        const todayCount = activeStudents.filter(s => {
            return s.date_created && new Date(s.date_created).toDateString() === today;
        }).length;

        if (document.getElementById('totalStudentCount')) 
            document.getElementById('totalStudentCount').innerText = activeStudents.length;
        
        if (document.getElementById('todaySignupCount'))
            document.getElementById('todaySignupCount').innerText = todayCount;

        if (activeStudents.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No active students yet.</td></tr>';
            return;
        }

        tbody.innerHTML = activeStudents.map(s => {
            const statusBadge = s.is_verified 
                ? `<span class="status-badge active">ACTIVE</span>`
                : `<span class="status-badge pending">AUTHORIZED</span>`;

            return `
                <tr>
                    <td>${statusBadge}</td>
                    <td>${s.username}</td>
                    <td>${s.full_name}</td>
                    <td>${s.campus || 'N/A'}</td>
                    <td style="text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                            <button class="btn outline" style="padding: 6px 12px; font-size: 0.85rem;"
                                onclick="viewPerformance('${s.username}')">
                                <i class="fas fa-chart-bar"></i> View
                            </button>
                            <button class="btn danger" style="padding: 6px 12px; font-size: 0.85rem;"
                                onclick="handleRemoveStudent(${s.id}, '${s.full_name}')">
                                <i class="fas fa-user-minus"></i> Drop
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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

async function removeFaculty(email) {
    if (!confirm(`Remove ${email} from the faculty list?`)) return;
    const requesterEmail = localStorage.getItem('username');
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/remove-faculty`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, requesterEmail })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Faculty member removed.");
            renderFacultyTable();
        } else {
            alert(data.error || "Failed to remove.");
        }
    } catch (err) { alert("Connection error."); }
}

async function promoteToAdmin(email) {
    if (!confirm(`Promote ${email} to Admin?`)) return;
    const requesterEmail = localStorage.getItem('username');
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/update-faculty-role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, is_admin: 1, requesterEmail })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Promoted to Admin!");
            renderFacultyTable();
        } else {
            alert(data.error || "Failed to promote.");
        }
    } catch (err) { alert("Connection error."); }
}

async function demoteToTeacher(email) {
    if (!confirm(`Demote ${email} back to Teacher?`)) return;
    const requesterEmail = localStorage.getItem('username');
    try {
        const res = await fetch(`${API_BASE_URL}/api/scores/update-faculty-role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, is_admin: 0, requesterEmail })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Demoted to Teacher.");
            renderFacultyTable();
        } else {
            alert(data.error || "Failed to demote.");
        }
    } catch (err) { alert("Connection error."); }
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

        let textToMatch = '';

        if (type === 'campus') textToMatch = row.children[1]?.innerText || '';
        if (type === 'role') textToMatch = row.children[2]?.innerText || '';
        if (type === 'category') textToMatch = row.children[5]?.innerText || '';

        if (value === 'all' || textToMatch.toLowerCase().includes(value.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

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
                const data = await res.json();
                alert("Profile picture updated!");
                cropperModal.style.display = 'none';
                avatarInput.value = ""; 
                displayProfileInfo(); 
            } else {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errData = await res.json();
                    alert("Upload Error: " + errData.error);
                } else {
                    const fullError = await res.text();
                    console.error("Server crashed:", fullError);
                    alert("Server Error (500): The folder path is still incorrect or inaccessible.");
                }
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Connection error to backend. Check your terminal for errors.");
        }
    }, 'image/jpeg', 0.9);
});

function setupSearchableDropdown(inputId, selectId) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    if (!input || !select) return;

    input.addEventListener('input', function () {
        const filter = this.value.toLowerCase().trim();
        const options = select.options;
        let hasResults = false;

        if (!filter) {
            select.style.display = 'none';
            select.value = '';
            return;
        }

        for (let i = 0; i < options.length; i++) {
            if (options[i].disabled) continue;
            const match = options[i].text.toLowerCase().includes(filter);
            options[i].style.display = match ? '' : 'none';
            if (match) hasResults = true;
        }

        select.style.display = hasResults ? 'block' : 'none';
    });

    select.addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        if (selected && selected.value) {
            input.value = selected.text;
            select.style.display = 'none';
        }
    });

    document.addEventListener('mousedown', function (e) {
        if (!input.contains(e.target) && !select.contains(e.target)) {
            select.style.display = 'none';
        }
    });

    input.addEventListener('focus', function () {
        if (this.value.trim()) {
            this.dispatchEvent(new Event('input'));
        }
    });
}   

window.editScore = editScore;
window.lockScore = lockScore;
window.displayProfileInfo = displayProfileInfo;
window.saveProfileChanges = saveProfileChanges;
window.approveStudent = approveStudent;
window.handleRemoveStudent = handleRemoveStudent;
window.removeFaculty = removeFaculty;
window.promoteToAdmin = promoteToAdmin;
window.demoteToTeacher = demoteToTeacher;
window.approveFacultyRequest = approveFacultyRequest;
window.declineFacultyRequest = declineFacultyRequest;