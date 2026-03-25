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
    const { student_id, subject_id, score, category, total_items } = req.body;
    const imageUrl = req.file ? req.file.filename : null;
    if (parseInt(score) > parseInt(total_items)) {
        return res.status(400).json({ error: `Invalid Score: Cannot be greater than Total.` });
    }
    const sql = "INSERT INTO records (student_id, subject_id, score, category, paper_image_url, total_items) VALUES (?, ?, ?, ?, ?, ?)";
    try {
        await db.execute(sql, [student_id, subject_id, score, category, imageUrl, total_items || 0]);
        res.json({ message: "Score saved and visible only to the student!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- THE CRITICAL PRIVACY FIX ---
router.get('/get-records', async (req, res) => {
    const { email } = req.query; // Student email from browser

    try {
        // We select the student details by joining records with the users table
        let sql = `
            SELECT 
                r.id, r.score, r.total_items, r.category, r.paper_image_url, 
                r.is_finalized, r.date_created, u.full_name, s.name AS subject_name 
            FROM records r
            INNER JOIN users u ON r.student_id = u.id
            INNER JOIN subjects s ON r.subject_id = s.id`;

        // If email is provided (from Student interface), filter STICKTLY by that email
        if (email && email !== 'null' && email !== 'undefined' && email !== '') {
            sql += ` WHERE u.username = ? ORDER BY r.date_created DESC`;
            const [data] = await db.execute(sql, [email]);
            return res.json(data);
        }

        // If no email (from Teacher Dashboard), show everything
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

module.exports = router;