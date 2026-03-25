const express = require('express');
const router = express.Router();
const db = require('../db');
const admin = require("firebase-admin");
const path = require('path');
const multer = require('multer');

const serviceAccount = require(path.join(__dirname, '../firebase-admin.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/register-sorsu', async (req, res) => {
    const { token, campus } = req.body; 
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { email, name, picture } = decodedToken;

        const [whitelist] = await db.execute("SELECT * FROM teacher_whitelist WHERE email = ?", [email]);
        const assignedRole = whitelist.length > 0 ? 'teacher' : 'student';

        const [result] = await db.execute(
            "INSERT INTO users (full_name, username, password, role, campus, profile_photo, is_verified, is_approved) VALUES (?, ?, 'sso_only', ?, ?, ?, 1, 0)",
            [name, email, assignedRole, campus, picture]
        );

        const [newUser] = await db.execute("SELECT id, role, username, is_approved FROM users WHERE id = ?", [result.insertId]);
        
        res.json({ 
            message: "Registration successful!", 
            user: newUser[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/profile/upload-photo', upload.single('profile_photo'), async (req, res) => {
    const { email } = req.body;
    if (!req.file) return res.status(400).json({ error: "No image file provided" });
    const filename = req.file.filename;

    try {
        await db.execute("UPDATE users SET profile_photo = ? WHERE username = ?", [filename, email]);
        res.json({ message: "Photo uploaded successfully!", filename: filename });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Failed to save photo reference" });
    }
});

router.get('/profile', async (req, res) => {
    const { all, username } = req.query; 
    try {
        if (all === 'true') {
            const [users] = await db.execute("SELECT id, full_name, username, role, campus, is_approved, is_verified FROM users");
            return res.json(users);
        }
        const [users] = await db.execute('SELECT full_name, username, bio, profile_photo FROM users WHERE username = ?', [username]);
        if (users.length > 0) res.json(users[0]);
        else res.status(404).json({ message: "User not found" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/profile/update', async (req, res) => {
    const { fullName, bio, email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    try {
        await db.execute("UPDATE users SET full_name = ?, bio = ? WHERE username = ?", [fullName, bio, email]);
        res.json({ message: "Profile updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

router.delete('/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Cannot delete student with existing records." });
    }
});

router.post('/google-login', async (req, res) => {
    const { token } = req.body; 
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { email } = decodedToken;

        let [users] = await db.execute(
            "SELECT id, role, username, full_name, profile_photo, is_approved FROM users WHERE username = ?", 
            [email]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: "User not registered." });
        }

        res.json({ 
            message: "Authenticated!", 
            user: users[0] 
        });
    } catch (error) {
        res.status(401).json({ error: "Invalid Credentials" });
    }
});

router.get('/check-user', async (req, res) => {
    const { email } = req.query;
    try {
        const [users] = await db.execute("SELECT id FROM users WHERE username = ?", [email]);
        if (users.length > 0) {
            return res.json({ exists: true });
        }
        res.json({ exists: false });
    } catch (err) {
        res.status(500).json({ error: "Database check failed" });
    }
});

router.post('/authorize-student', async (req, res) => {
    const { email, fullName } = req.body;
    try {
        const [existing] = await db.execute("SELECT id FROM users WHERE username = ?", [email]);
        if (existing.length > 0) return res.status(400).json({ error: "Email already authorized or registered." });

        await db.execute("DELETE FROM teacher_whitelist WHERE email = ?", [email]);

        await db.execute(
            "INSERT INTO users (full_name, username, password, role, is_verified, is_approved) VALUES (?, ?, 'pending_sso', 'student', 0, 0)",
            [fullName, email]
        );

        res.json({ message: "Student authorized successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/approve-student/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("UPDATE users SET is_approved = 1 WHERE id = ?", [id]);
        res.json({ message: "Student approved successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database update failed." });
    }
});

router.get('/google-login-status', async (req, res) => {
    const { email } = req.query;
    try {
        const [users] = await db.execute("SELECT is_approved FROM users WHERE username = ?", [email]);
        if (users.length > 0) res.json(users[0]);
        else res.status(404).json({ error: "Not found" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;