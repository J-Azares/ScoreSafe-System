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

        const sql = "INSERT INTO teacher_whitelist (email, campus, is_admin) VALUES (?, ?, 0)";
        await db.execute(sql, [email, campus || 'Main']);

        res.json({ message: `Teacher ${email} successfully authorized for ${campus || 'Main'} campus.` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "This teacher is already authorized." });
        }
        console.error("Auth Teacher Error:", err.message);
        res.status(500).json({ error: "Internal server error." });
    }
});

router.get('/get-faculty', async (req, res) => {
    try {
        const [faculty] = await db.execute("SELECT * FROM teacher_whitelist ORDER BY campus ASC");
        res.json(faculty);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/upload-score', upload.single('paper_image'), async (req, res) => {
    const { student_id, subject_id, score, category, total_items } = req.body;
    const imageUrl = req.file ? req.file.filename : null;

    const numScore = parseInt(score);
    const numTotal = parseInt(total_items);

    if (numScore > numTotal) {
        return res.status(400).json({ 
            error: `Invalid Score: ${numScore} cannot be greater than ${numTotal}.` 
        });
    }

    const sql = "INSERT INTO records (student_id, subject_id, score, category, paper_image_url, total_items) VALUES (?, ?, ?, ?, ?, ?)";
    
    try {
        await db.execute(sql, [student_id, subject_id, score, category, imageUrl, total_items || 0]);
        res.json({ message: "Score and physical evidence backed up!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/add-subject', async (req, res) => {
    const { name } = req.body;
    try {
        const sql = "INSERT INTO subjects (name) VALUES (?)";
        await db.execute(sql, [name]);
        res.json({ message: "Subject added successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/get-records', async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.id, r.score, r.total_items, r.category, r.paper_image_url, 
                r.is_finalized, r.date_created, u.full_name, s.name AS subject_name 
            FROM records r
            LEFT JOIN users u ON r.student_id = u.id
            LEFT JOIN subjects s ON r.subject_id = s.id
            ORDER BY r.date_created DESC`;
            
        const [data] = await db.execute(sql); 
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/get-subjects', async (req, res) => {
    try {
        const [subjects] = await db.execute("SELECT * FROM subjects");
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
        res.json({ message: "Subject deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Cannot delete subject because it has recorded scores." });
    }
});

module.exports = router;