// Teacher page JS - manages students, subjects, scores and papers
(() => {
	const STUDENTS_KEY = 'scoresafe_students';
	const SUBJECTS_KEY = 'scoresafe_subjects';
	const RECORDS_KEY = 'scoresafe_records';

	// Utilities
	const read = (key) => JSON.parse(localStorage.getItem(key) || '[]');
	const write = (key, val) => localStorage.setItem(key, JSON.stringify(val));

	function byId(id) { return document.getElementById(id); }

	// Generic renderers
	function populateSelect(selectEl, items, placeholder) {
		if (!selectEl) return;
		selectEl.innerHTML = '';
		const empty = document.createElement('option');
		empty.value = '';
		empty.textContent = placeholder || '-- Select --';
		selectEl.appendChild(empty);
		items.forEach(it => {
			const o = document.createElement('option');
			o.value = it.email || it.name || it;
			o.textContent = it.name || it.email || it;
			selectEl.appendChild(o);
		});
	}

	// Students page
	function initStudentsPage() {
		const form = byId('addStudentForm');
		const table = byId('studentsTable');
		const msg = byId('studentMsg');

		function render() {
			const students = read(STUDENTS_KEY);
			const tbody = table.querySelector('tbody');
			tbody.innerHTML = '';
			if (!students.length) {
				const tr = document.createElement('tr');
				tr.className = 'empty-row';
				tr.innerHTML = '<td colspan="3">No students yet</td>';
				tbody.appendChild(tr);
				return;
			}
			students.forEach(s => {
				const tr = document.createElement('tr');
				tr.innerHTML = `<td>${s.email}</td><td>${s.name}</td><td><button class="btn outline" data-email="${s.email}" data-action="delete-student">Delete</button></td>`;
				tbody.appendChild(tr);
			});
		}

		if (form) {
			form.addEventListener('submit', e => {
				e.preventDefault();
				const email = byId('studentEmail').value.trim();
				const name = byId('studentName').value.trim();
				if (!email || !name) return;
				const students = read(STUDENTS_KEY);
				if (students.find(s => s.email === email)) {
					msg.textContent = 'Student already exists.'; return;
				}
				students.push({ email, name });
				write(STUDENTS_KEY, students);
				form.reset();
				msg.textContent = 'Student added.';
				render();
				broadcastUpdate();
			});
		}

		table.addEventListener('click', e => {
			const btn = e.target.closest('button[data-action]');
			if (!btn) return;
			const action = btn.dataset.action;
			if (action === 'delete-student') {
				const email = btn.dataset.email;
				let students = read(STUDENTS_KEY);
				students = students.filter(s => s.email !== email);
				write(STUDENTS_KEY, students);
				// also remove related records
				let records = read(RECORDS_KEY);
				records = records.filter(r => r.studentEmail !== email);
				write(RECORDS_KEY, records);
				render();
				broadcastUpdate();
			}
		});

		render();
	}

	// Subjects page
	function initSubjectsPage() {
		const form = byId('addSubjectForm');
		const table = byId('subjectsTable');
		const msg = byId('subjectMsg');

		function render() {
			const subjects = read(SUBJECTS_KEY);
			const tbody = table.querySelector('tbody');
			tbody.innerHTML = '';
			if (!subjects.length) {
				const tr = document.createElement('tr');
				tr.className = 'empty-row';
				tr.innerHTML = '<td colspan="3">No subjects yet</td>';
				tbody.appendChild(tr);
				return;
			}
			subjects.forEach((s, idx) => {
				const tr = document.createElement('tr');
				tr.innerHTML = `<td>${s}</td><td><button class="btn outline" data-idx="${idx}" data-action="delete-subject">Delete</button></td>`;
				tbody.appendChild(tr);
			});
		}

		if (form) {
			form.addEventListener('submit', e => {
				e.preventDefault();
				const name = byId('subjectName').value.trim();
				if (!name) return;
				const subjects = read(SUBJECTS_KEY);
				if (subjects.includes(name)) { msg.textContent = 'Subject exists.'; return; }
				subjects.push(name);
				write(SUBJECTS_KEY, subjects);
				form.reset();
				msg.textContent = 'Subject added.';
				render();
				broadcastUpdate();
			});
		}

		table.addEventListener('click', e => {
			const btn = e.target.closest('button[data-action]');
			if (!btn) return;
			if (btn.dataset.action === 'delete-subject') {
				const idx = Number(btn.dataset.idx);
				const subjects = read(SUBJECTS_KEY);
				const removed = subjects.splice(idx, 1);
				write(SUBJECTS_KEY, subjects);
				// remove subject from records
				let records = read(RECORDS_KEY);
				records = records.filter(r => r.subject !== removed[0]);
				write(RECORDS_KEY, records);
				render();
				broadcastUpdate();
			}
		});

		render();
	}

	// Record score page & Upload paper
	function initRecordAndUploadPages() {
		const recordForm = byId('recordScoreForm');
		const uploadForm = byId('uploadPaperForm');
		const scoresTable = document.querySelectorAll('#scoresTable');

		function refreshSelects() {
			const students = read(STUDENTS_KEY);
			const subjects = read(SUBJECTS_KEY);
			const sEls = [byId('studentSelect'), byId('studentSelectUpload'), byId('studentSelect')];
			const suEls = [byId('subjectSelect'), byId('subjectSelectUpload'), byId('subjectSelectUpload')];
			// use unique set
			const studentOpts = students.map(s => ({ email: s.email, name: s.name }));
			sEls.forEach(el => { if (el) populateSelect(el, studentOpts, '-- Select Student --'); });
			suEls.forEach(el => { if (el) populateSelect(el, subjects, '-- Select Subject --'); });
		}

		function renderScoresTables() {
			const records = read(RECORDS_KEY);
			const students = read(STUDENTS_KEY);
			document.querySelectorAll('#scoresTable').forEach(table => {
				const tbody = table.querySelector('tbody');
				tbody.innerHTML = '';
				if (!records.length) {
					const tr = document.createElement('tr');
					tr.className = 'empty-row';
					tr.innerHTML = `<td colspan="${table.querySelectorAll('th').length}">No records yet</td>`;
					tbody.appendChild(tr);
					return;
				}
				records.slice().reverse().forEach((r, idx) => {
					const tr = document.createElement('tr');
					const student = students.find(s => s.email === r.studentEmail);
					const studentName = student ? student.name : r.studentEmail;
					const paperLink = r.paperDataUrl ? `<a class="view-link" href="${r.paperDataUrl}" target="_blank">View</a>` : '';
					tr.innerHTML = `<td>${studentName}</td><td>${r.subject}</td><td>${r.score || ''}</td><td>${paperLink}</td><td>${r.category}</td><td>${new Date(r.date).toLocaleString()}</td><td><button class="btn outline" data-idx="${idx}" data-action="edit-record">Edit</button> <button class="btn outline" data-idx="${idx}" data-action="delete-record">Delete</button></td>`;
					tbody.appendChild(tr);
				});
			});
		}

		if (recordForm) {
			recordForm.addEventListener('submit', e => {
				e.preventDefault();
				const studentEmail = byId('studentSelect').value;
				const subject = byId('subjectSelect').value;
				const category = byId('categorySelect').value;
				const score = byId('score').value;
				const file = byId('paperFile').files[0];
				if (!studentEmail || !subject || !category) return;
				const record = { studentEmail, subject, category, score: Number(score), date: Date.now() };
				if (file) {
					const reader = new FileReader();
					reader.onload = function() {
						record.paperName = file.name;
						record.paperDataUrl = reader.result;
						const records = read(RECORDS_KEY);
						records.push(record);
						write(RECORDS_KEY, records);
						recordForm.reset();
						renderScoresTables();
						broadcastUpdate();
					};
					reader.readAsDataURL(file);
				} else {
					const records = read(RECORDS_KEY);
					records.push(record);
					write(RECORDS_KEY, records);
					recordForm.reset();
					renderScoresTables();
					broadcastUpdate();
				}
			});
		}

		if (uploadForm) {
			uploadForm.addEventListener('submit', e => {
				e.preventDefault();
				const studentEmail = byId('studentSelectUpload').value;
				const subject = byId('subjectSelectUpload').value;
				const category = byId('categorySelectUpload').value;
				const file = byId('paperFile').files[0];
				if (!studentEmail || !subject || !file) return;
				const reader = new FileReader();
				reader.onload = function() {
					const dataUrl = reader.result;
					const records = read(RECORDS_KEY);
					records.push({ studentEmail, subject, category, paperName: file.name, paperDataUrl: dataUrl, date: Date.now() });
					write(RECORDS_KEY, records);
					uploadForm.reset();
					renderScoresTables();
					broadcastUpdate();
				};
				reader.readAsDataURL(file);
			});
		}

		// delete and edit records
		document.addEventListener('click', e => {
			const btn = e.target.closest('button[data-action]');
			if (!btn) return;
			const idx = Number(btn.dataset.idx);
			let records = read(RECORDS_KEY);
			const realIdx = records.length - 1 - idx;
			if (btn.dataset.action === 'delete-record') {
				records.splice(realIdx, 1);
				write(RECORDS_KEY, records);
				renderScoresTables();
				broadcastUpdate();
			} else if (btn.dataset.action === 'edit-record') {
				const tr = btn.closest('tr');
				const tds = tr.querySelectorAll('td');
				const studentTd = tds[0];
				const subjectTd = tds[1];
				const scoreTd = tds[2];
				const categoryTd = tds[4];
				const actionsTd = tds[6];
				const originalStudent = records[realIdx].studentEmail;
				const originalSubject = records[realIdx].subject;
				const originalScore = records[realIdx].score || '';
				const originalCategory = records[realIdx].category;
				const students = read(STUDENTS_KEY);
				const subjects = read(SUBJECTS_KEY);
				let studentSelect = '<select style="width: 150px;">';
				students.forEach(s => {
					studentSelect += `<option value="${s.email}" ${s.email === originalStudent ? 'selected' : ''}>${s.email}</option>`;
				});
				studentSelect += '</select>';
				let subjectSelect = '<select style="width: 100px;">';
				subjects.forEach(s => {
					subjectSelect += `<option value="${s}" ${s === originalSubject ? 'selected' : ''}>${s}</option>`;
				});
				subjectSelect += '</select>';
				studentTd.innerHTML = studentSelect;
				subjectTd.innerHTML = subjectSelect;
				scoreTd.innerHTML = `<input type="number" value="${originalScore}" style="width: 60px;">`;
				categoryTd.innerHTML = `<select style="width: 100px;"><option value="Performance" ${originalCategory === 'Performance' ? 'selected' : ''}>Performance</option><option value="Activity" ${originalCategory === 'Activity' ? 'selected' : ''}>Activity</option><option value="Quiz" ${originalCategory === 'Quiz' ? 'selected' : ''}>Quiz</option><option value="Recitation" ${originalCategory === 'Recitation' ? 'selected' : ''}>Recitation</option><option value="Examination" ${originalCategory === 'Examination' ? 'selected' : ''}>Examination</option></select>`;
				actionsTd.innerHTML = `<button class="btn" data-idx="${idx}" data-action="save-edit">Save</button> <button class="btn outline" data-idx="${idx}" data-action="cancel-edit">Cancel</button>`;
			} else if (btn.dataset.action === 'save-edit') {
				const tr = btn.closest('tr');
				const tds = tr.querySelectorAll('td');
				const studentSelect = tds[0].querySelector('select');
				const subjectSelect = tds[1].querySelector('select');
				const scoreInput = tds[2].querySelector('input');
				const categorySelect = tds[4].querySelector('select');
				records[realIdx].studentEmail = studentSelect.value;
				records[realIdx].subject = subjectSelect.value;
				records[realIdx].score = Number(scoreInput.value);
				records[realIdx].category = categorySelect.value;
				write(RECORDS_KEY, records);
				renderScoresTables();
				broadcastUpdate();
			} else if (btn.dataset.action === 'cancel-edit') {
				renderScoresTables();
			}
		});

		refreshSelects();
		renderScoresTables();

		// also update selects when storage changes
		window.addEventListener('storage', (e) => {
			if ([STUDENTS_KEY, SUBJECTS_KEY, RECORDS_KEY].includes(e.key)) {
				refreshSelects(); renderScoresTables();
			}
		});
	}

	// Dashboard
	function initDashboardPage() {
		const totalRecordsEl = byId('totalRecords');
		const totalStudentsEl = byId('totalStudents');
		const totalSubjectsEl = byId('totalSubjects');
		const searchInput = byId('searchInput');

		function renderStats() {
			const students = read(STUDENTS_KEY);
			const subjects = read(SUBJECTS_KEY);
			const records = read(RECORDS_KEY);
			if (totalRecordsEl) totalRecordsEl.textContent = records.length;
			if (totalStudentsEl) totalStudentsEl.textContent = students.length;
			if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
		}

		function initSearch() {
			if (!searchInput) return;
			searchInput.addEventListener('input', () => {
				const q = searchInput.value.toLowerCase().trim();
				document.querySelectorAll('#scoresTable tbody tr').forEach(tr => {
					if (tr.classList.contains('empty-row')) return;
					const text = tr.textContent.toLowerCase();
					tr.style.display = text.includes(q) ? '' : 'none';
				});
			});
		}

		renderStats();
		initSearch();

		window.addEventListener('storage', (e) => {
			if ([STUDENTS_KEY, SUBJECTS_KEY, RECORDS_KEY].includes(e.key)) renderStats();
		});
	}

	// broadcast helper to notify other tabs/pages
	function broadcastUpdate() {
		// write a timestamp to a dedicated key to trigger storage events
		localStorage.setItem('scoresafe_last_update', Date.now());
	}

	// Detect which page to init
	document.addEventListener('DOMContentLoaded', () => {
		// Hamburger menu toggle
		const hamburger = byId('hamburger');
		const nav = document.querySelector('nav');
		if (hamburger && nav) {
			hamburger.addEventListener('click', () => {
				nav.classList.toggle('active');
			});
		}

		// Students page
		if (byId('addStudentForm')) initStudentsPage();
		if (byId('addSubjectForm')) initSubjectsPage();
		if (byId('recordScoreForm') || byId('uploadPaperForm') || document.querySelectorAll('#scoresTable').length) initRecordAndUploadPages();
		if (byId('totalRecords')) initDashboardPage();
	});

})();
