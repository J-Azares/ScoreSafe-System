const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const [result] = await db.execute(
            'INSERT INTO users (full_name, username, password, role) VALUES (?, ?, ?, ?)', 
            [name, email, password, role.toLowerCase()]
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("DATABASE ERROR:", err.message);
        res.status(500).json({ message: "Registration failed", error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?', 
            [username, password]
        );
        if (users.length > 0) {
            res.json({ message: "Login successful!", role: users[0].role });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;