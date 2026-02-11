const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, '../../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
});

app.listen(8080, () => {
  console.log('Server is listening on port 8080');
});

const mysql = require('mysql2');

// Create connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',        // your MySQL username
  password: '',        // your MySQL password
  database: 'scoresafe'
});

// Connect
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to MySQL database.');
  }
});

module.exports = db;