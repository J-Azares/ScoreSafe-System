
// server.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'css'))); // serve CSS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // put EJS files in 'views' folder

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // your MySQL username
    password: '',       // your MySQL password
    database: 'scoresafe_db'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('DB connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database!');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.send('No user found');
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.send('Incorrect password');
        }

        // For demo: redirect to dashboard with user ID
        res.redirect(`/dashboard/${user.user_id}`);
    });
});

app.get('/dashboard/:id', (req, res) => {
    const studentId = req.params.id;

    const sql = `
        SELECT s.subject_name, a.title AS assessment, sc.score, a.total_score
        FROM scores sc
        JOIN assessments a ON sc.assessment_id = a.assessment_id
        JOIN classes c ON a.class_id = c.class_id
        JOIN subjects s ON c.subject_id = s.subject_id
        WHERE sc.student_id = ?;
    `;

    db.query(sql, [studentId], (err, results) => {
        if (err) throw err;
        res.render('dashboard', { scores: results });
    });
});

// Login page (GET)
app.get('/login', (req, res) => {
    res.render('login'); // make sure login.ejs exists in views/
});

// Dashboard page (GET)
app.get('/dashboard/:id', (req, res) => {
    const studentId = req.params.id;

    const sql = `
        SELECT s.subject_name, a.title AS assessment, sc.score, a.total_score
        FROM scores sc
        JOIN assessments a ON sc.assessment_id = a.assessment_id
        JOIN classes c ON a.class_id = c.class_id
        JOIN subjects s ON c.subject_id = s.subject_id
        WHERE sc.student_id = ?;
    `;

    db.query(sql, [studentId], (err, results) => {
        if (err) throw err;
        res.render('dashboard', { scores: results });
    });
});



app.listen(3000, () => console.log('Server running on http://localhost:3000'));
