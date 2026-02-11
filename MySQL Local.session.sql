-- ----------------------------------------
-- ScoreSafe Database + Tables + Sample Data
-- ----------------------------------------

-- Create and use database
DROP DATABASE IF NOT EXISTS scoresafe_db;
CREATE DATABASE scoresafe_db;
USE scoresafe_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    user_identifier VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL
);

-- Classes Table
CREATE TABLE IF NOT EXISTS classes (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    class_name VARCHAR(100),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(class_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id)
);

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    total_score INT NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
);

-- Scores Table
CREATE TABLE IF NOT EXISTS scores (
    score_id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    student_id INT NOT NULL,
    score INT NOT NULL,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id)
);

-- --------------------------------------------------
-- Sample Data (Test Users, Subjects, Classes, Scores)
-- --------------------------------------------------

-- Sample users:
-- (password for all below = "password123" for testing)
INSERT INTO users (full_name, email, user_identifier, password, role)
VALUES
('Juan Dela Cruz', 'juan@student.edu', '2023-001', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student'),
('Maria Santos', 'maria@student.edu', '2023-002', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'student'),
('Ms. Reyes', 'reyes@school.edu', 'TCHR-101', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'teacher');

-- Sample subjects
INSERT INTO subjects (subject_name)
VALUES ('Mathematics'), ('English'), ('Science');

-- Sample classes (Math and English taught by Ms. Reyes)
INSERT INTO classes (subject_id, teacher_id, class_name)
VALUES (1, 3, 'Math A'),
       (2, 3, 'English A');

-- Enroll students in classes
INSERT INTO enrollments (class_id, student_id)
VALUES (1, 1), (1, 2), (2, 1), (2, 2);

-- Sample assessments
INSERT INTO assessments (class_id, title, total_score)
VALUES (1, 'Quiz 1', 20),
       (1, 'Quiz 2', 20),
       (2, 'Activity', 30);

-- Sample scores
INSERT INTO scores (assessment_id, student_id, score)
VALUES 
(1, 1, 18),
(2, 1, 15),
(3, 1, 28),
(1, 2, 17),
(2, 2, 16),
(3, 2, 27);

