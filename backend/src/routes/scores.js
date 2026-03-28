const express = require('express');
const router = express.Router();
const db = require('../db'); 
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/authorize-teacher', async (req, res) => {
    const { email, campus } = req.body;
    try {
        if (!email || !email.endsWith('@sorsu.edu.ph')) {
            return res.status(400).json({ error: "Invalid email. Must be a @sorsu.edu.ph account." });
        }
        const [existing] = await db.execute("SELECT role FROM users WHERE username = ?", [email]);
        if (existing.length > 0 && existing[0].role === 'teacher') {
            return res.status(400).json({ error: "This user is already a registered Teacher." });
        }
        await db.execute("DELETE FROM users WHERE username = ? AND role = 'student'", [email]);
        const sql = "INSERT INTO teacher_whitelist (email, campus, is_admin) VALUES (?, ?, 0)";
        await db.execute(sql, [email, campus || 'Main']);
        res.json({ message: `Teacher authorized. Previous student record cleared.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Email already in whitelist." });
        res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/get-faculty', async (req, res) => {
    try {
        const [faculty] = await db.execute("SELECT * FROM teacher_whitelist ORDER BY campus ASC");
        res.json(faculty);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload-score', upload.single('paper_image'), async (req, res) => {
    const { student_id, subject_id, score, category, total_items, recorded_by_id } = req.body;
    const imageUrl = req.file ? req.file.filename : null;

    if (parseInt(score) > parseInt(total_items)) {
        return res.status(400).json({ error: `Invalid Score: Cannot be greater than Total.` });
    }

    const sql = "INSERT INTO records (student_id, subject_id, score, category, paper_image_url, total_items, recorded_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    try {
        await db.execute(sql, [student_id, subject_id, score, category, imageUrl, total_items || 0, recorded_by_id]);
        res.json({ message: "Score saved and visible only to the student!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

router.get('/get-records', async (req, res) => {
    const { email } = req.query; 

    try {
        let sql = `
            SELECT 
                r.id, r.score, r.total_items, r.category, r.paper_image_url, 
                r.is_finalized, r.date_created, u.full_name, s.name AS subject_name,
                t.full_name AS teacher_name
            FROM records r
            INNER JOIN users u ON r.student_id = u.id
            INNER JOIN subjects s ON r.subject_id = s.id
            LEFT JOIN users t ON r.recorded_by_id = t.id`;

        if (email && email !== 'null' && email !== 'undefined' && email !== '') {
            sql += ` WHERE u.username = ? ORDER BY r.date_created DESC`;
            const [data] = await db.execute(sql, [email]);
            return res.json(data);
        }

        const [allData] = await db.execute(sql + ` ORDER BY r.date_created DESC`);
        res.json(allData);

    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch records." });
    }
});

router.get('/get-subjects', async (req, res) => {
    try {
        const [subjects] = await db.execute("SELECT * FROM subjects");
        res.json(subjects);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/update-score/:id', async (req, res) => {
    const { id } = req.params;
    const { new_score } = req.body;
    await db.execute("UPDATE records SET score = ? WHERE id = ?", [new_score, id]);
    res.json({ message: "Updated!" });
});

router.put('/finalize-score/:id', async (req, res) => {
    await db.execute("UPDATE records SET is_finalized = 1 WHERE id = ?", [req.params.id]);
    res.json({ message: "Locked!" });
});

router.delete('/delete-subject/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
        res.json({ message: "Deleted!" });
    } catch (err) { res.status(500).json({ error: "Subject has scores." }); }
});

router.post('/add-subject', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subject name is required." });

    try {
        const [existing] = await db.execute("SELECT id FROM subjects WHERE name = ?", [name]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "This subject is already in the system." });
        }

        await db.execute("INSERT INTO subjects (name) VALUES (?)", [name]);
        res.json({ message: "Subject added successfully!" });
    } catch (err) {
        console.error("Subject Add Error:", err);
        res.status(500).json({ error: "Database error while adding subject." });
    }
});

router.delete('/remove-faculty', async (req, res) => {
    const { email } = req.body;
    try {
        await db.execute("DELETE FROM teacher_whitelist WHERE email = ?", [email]);
        res.json({ message: "Faculty removed successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove faculty." });
    }
});

router.put('/update-faculty-role', async (req, res) => {
    const { email, is_admin, requesterEmail } = req.body;
    try {
        const [requester] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ?", 
            [requesterEmail]
        );

        if (requester.length === 0 || !requester[0].is_admin) {
            return res.status(403).json({ error: "Only admins can promote or demote faculty." });
        }

        await db.execute(
            "UPDATE teacher_whitelist SET is_admin = ? WHERE email = ?", 
            [is_admin, email]
        );
        res.json({ message: "Role updated successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to update role." });
    }
});

router.delete('/remove-faculty', async (req, res) => {
    const { email, requesterEmail } = req.body;
    try {
        const [requester] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ?", 
            [requesterEmail]
        );
        
        if (requester.length === 0) {
            return res.status(403).json({ error: "Access denied." });
        }

        const [target] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ?", 
            [email]
        );
        
        if (!requester[0].is_admin && target[0]?.is_admin) {
            return res.status(403).json({ error: "Teachers cannot remove admins." });
        }

        await db.execute("DELETE FROM teacher_whitelist WHERE email = ?", [email]);
        res.json({ message: "Faculty removed successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove faculty." });
    }
});

router.post('/request-authorize-teacher', async (req, res) => {
    const { email, campus, requesterEmail } = req.body;
    try {
        if (!email || !email.endsWith('@sorsu.edu.ph')) {
            return res.status(400).json({ error: "Invalid email. Must be a @sorsu.edu.ph account." });
        }

        const [studentCheck] = await db.execute(
            "SELECT role FROM users WHERE username = ?", [email]
        );
        if (studentCheck.length > 0 && studentCheck[0].role === 'student') {
            return res.status(400).json({ error: "This account is registered as a student and cannot be added as a faculty member." });
        }

        const [existingFaculty] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ? AND is_pending = 0", [email]
        );
        if (existingFaculty.length > 0) {
            return res.status(400).json({ 
                error: `This email is already an authorized ${existingFaculty[0].is_admin ? 'Admin' : 'Teacher'}.` 
            });
        }

        const [requester] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ?", [requesterEmail]
        );
        if (requester.length === 0) {
            return res.status(403).json({ error: "Access denied." });
        }

        if (requester[0].is_admin) {
            await db.execute(
                "INSERT INTO teacher_whitelist (email, campus, is_admin, is_pending) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE campus = ?, is_pending = 0",
                [email, campus, campus]
            );
            return res.json({ message: "Teacher authorized successfully.", status: 'approved' });
        } else {
            const [alreadyPending] = await db.execute(
                "SELECT id FROM teacher_whitelist WHERE email = ? AND is_pending = 1", [email]
            );
            if (alreadyPending.length > 0) {
                return res.status(400).json({ error: "A request for this email is already pending admin approval." });
            }
            await db.execute(
                "INSERT INTO teacher_whitelist (email, campus, is_admin, is_pending, requested_by) VALUES (?, ?, 0, 1, ?)",
                [email, campus, requesterEmail]
            );
            return res.json({ message: "Request submitted! Waiting for admin approval.", status: 'pending' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/pending-faculty-requests', async (req, res) => {
    try {
        const [pending] = await db.execute(
            "SELECT * FROM teacher_whitelist WHERE is_pending = 1"
        );
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/approve-faculty-request', async (req, res) => {
    const { email, requesterEmail } = req.body;
    try {
        const [requester] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ?", 
            [requesterEmail]
        );
        if (!requester[0]?.is_admin) {
            return res.status(403).json({ error: "Only admins can approve requests." });
        }
        await db.execute(
            "UPDATE teacher_whitelist SET is_pending = 0 WHERE email = ?", [email]
        );
        res.json({ message: "Teacher request approved." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/decline-faculty-request', async (req, res) => {
    const { email, requesterEmail } = req.body;
    try {
        const [requester] = await db.execute(
            "SELECT is_admin FROM teacher_whitelist WHERE email = ?", 
            [requesterEmail]
        );
        if (!requester[0]?.is_admin) {
            return res.status(403).json({ error: "Only admins can decline requests." });
        }
        await db.execute(
            "DELETE FROM teacher_whitelist WHERE email = ? AND is_pending = 1", [email]
        );
        res.json({ message: "Request declined." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;