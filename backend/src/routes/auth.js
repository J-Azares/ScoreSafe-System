const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client('200805836313-5980hgjr0tgoo8mrs6rsrrisl6lqma2s.apps.googleusercontent.com');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads')); 
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
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
            const [users] = await db.execute("SELECT id, full_name, username, role FROM users");
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
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: '200805836313-5980hgjr0tgoo8mrs6rsrrisl6lqma2s.apps.googleusercontent.com',
        });
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        if (!email.endsWith('@sorsu.edu.ph')) {
            return res.status(403).json({ error: "Access Denied. Use @sorsu.edu.ph only." });
        }

        const [whitelist] = await db.execute("SELECT * FROM teacher_whitelist WHERE email = ?", [email]);
        const assignedRole = whitelist.length > 0 ? 'teacher' : 'student';

        let [users] = await db.execute("SELECT * FROM users WHERE username = ?", [email]);
        let user;

        if (users.length === 0) {
            const [result] = await db.execute(
                "INSERT INTO users (full_name, username, password, role, profile_photo, is_verified) VALUES (?, ?, 'sso_verified', ?, ?, 1)",
                [name, email, assignedRole, picture]
            );
            const [newUser] = await db.execute("SELECT * FROM users WHERE id = ?", [result.insertId]);
            user = newUser[0];
        } else {
            user = users[0];
            await db.execute("UPDATE users SET role = ?, profile_photo = ? WHERE username = ?", [assignedRole, picture, email]);
            user.role = assignedRole;
        }

        res.json({ message: "Authenticated successfully!", user });

    } catch (error) {
        res.status(401).json({ error: "Authentication failed." });
    }
});

module.exports = router;