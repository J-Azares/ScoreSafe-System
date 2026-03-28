CREATE DATABASE IF NOT EXISTS scoresafe_db;
USE scoresafe_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    bio TEXT,
    profile_photo VARCHAR(255),
    campus VARCHAR(100),
    is_verified TINYINT(1) DEFAULT 0,
    is_approved TINYINT(1) DEFAULT 0,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Records table
CREATE TABLE IF NOT EXISTS records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    subject_id INT,
    score INT NOT NULL,
    total_items INT DEFAULT 0,
    category ENUM('Performance', 'Activity', 'Quiz', 'Recitation', 'Examination'),
    paper_image_url VARCHAR(255),
    is_finalized TINYINT(1) DEFAULT 0,
    recorded_by_id INT,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Teacher whitelist table
CREATE TABLE IF NOT EXISTS teacher_whitelist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    campus VARCHAR(100),
    is_admin TINYINT(1) DEFAULT 0,
    is_pending TINYINT(1) DEFAULT 0,
    requested_by VARCHAR(255) DEFAULT NULL
);

-- Default subjects
INSERT IGNORE INTO subjects (name) VALUES 
    ('Software Engineering'), 
    ('Digital Marketing');

-- Default admin
INSERT IGNORE INTO teacher_whitelist (email, campus, is_admin) VALUES 
    ('rollin.furio@sorsu.edu.ph', 'Bulan', 1);