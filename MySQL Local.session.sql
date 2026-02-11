CREATE DATABASE scoresafe_db;
USE scoresafe_db;

CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO students (name) VALUES ('Nel Azares');
INSERT INTO subjects (subject_name) VALUES ('Math');

SELECT * FROM students;

CREATE TABLE subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(100)
);

CREATE TABLE scores (
    score_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    subject_id INT,
    score FLOAT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);
