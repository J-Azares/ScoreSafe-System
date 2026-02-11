// ...existing code...
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scoresafe',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
});

// Basic health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Leaderboard (uses the view in your SQL)
app.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leaderboard');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch leaderboard' });
  }
});

// Scores: add a score (calls stored procedure add_score)
app.post('/scores', async (req, res) => {
  const { player_id, game_id, points, recorded_by } = req.body;
  if (!player_id || !game_id || typeof points !== 'number') {
    return res.status(400).json({ error: 'player_id, game_id and numeric points are required' });
  }

  try {
    const conn = await pool.getConnection();
    try {
      await conn.query('CALL add_score(?, ?, ?, ?)', [player_id, game_id, points, recorded_by || null]);
      res.status(201).json({ message: 'score recorded' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to record score' });
  }
});

// Players CRUD (minimal)
app.get('/players', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, team_id, display_name, email, total_score, created_at FROM players');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch players' });
  }
});

app.post('/players', async (req, res) => {
  const { team_id, display_name, email } = req.body;
  if (!display_name) return res.status(400).json({ error: 'display_name is required' });

  try {
    const [result] = await pool.query('INSERT INTO players (team_id, display_name, email) VALUES (?, ?, ?)', [team_id || null, display_name, email || null]);
    const [rows] = await pool.query('SELECT id, team_id, display_name, email, total_score FROM players WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create player' });
  }
});

// Teams
app.get('/teams', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM teams');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch teams' });
  }
});

app.post('/teams', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const [result] = await pool.query('INSERT INTO teams (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create team' });
  }
});

// Games
app.get('/games', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM games');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch games' });
  }
});

app.post('/games', async (req, res) => {
  const { name, scheduled_at } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const [result] = await pool.query('INSERT INTO games (name, scheduled_at) VALUES (?, ?)', [name, scheduled_at || null]);
    res.status(201).json({ id: result.insertId, name, scheduled_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create game' });
  }
});

// Simple users listing (do not expose password_hash)
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, email, role_id, created_at FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch users' });
  }
});

// Global error fallback
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
// ...existing code...