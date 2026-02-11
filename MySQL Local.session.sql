// ...existing code...
-- Create database and core schema for "scoresafe"
CREATE DATABASE IF NOT EXISTS `scoresafe` CHARACTER SET = 'utf8mb4' COLLATE = 'utf8mb4_unicode_ci';
USE `scoresafe`;

-- Roles / Users
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Teams and players
CREATE TABLE IF NOT EXISTS `teams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `players` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `team_id` INT NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `total_score` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Games / matches
CREATE TABLE IF NOT EXISTS `games` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `scheduled_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Scores recorded per player per game
CREATE TABLE IF NOT EXISTS `scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `player_id` INT NOT NULL,
  `game_id` INT NOT NULL,
  `points` INT NOT NULL,
  `recorded_by` INT,
  `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX (`player_id`),
  INDEX (`game_id`),
  INDEX (`recorded_at`)
) ENGINE=InnoDB;

-- Simple audit trail for changes (generic)
CREATE TABLE IF NOT EXISTS `audit_trail` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `table_name` VARCHAR(128) NOT NULL,
  `row_id` VARCHAR(64),
  `action` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `changed_by` INT,
  `details` JSON,
  INDEX (`table_name`),
  INDEX (`changed_by`)
) ENGINE=InnoDB;

-- Trigger: when a new score is inserted, update player's total_score and write audit
DELIMITER $$
CREATE TRIGGER `scores_after_insert` AFTER INSERT ON `scores`
FOR EACH ROW
BEGIN
  -- Update aggregate total
  UPDATE `players` SET `total_score` = IFNULL(`total_score`,0) + NEW.points WHERE `id` = NEW.player_id;

  -- Insert into audit trail
  INSERT INTO `audit_trail` (`table_name`, `row_id`, `action`, `changed_by`, `details`)
  VALUES ('scores', CAST(NEW.id AS CHAR), 'INSERT', NEW.recorded_by, JSON_OBJECT('player_id', NEW.player_id, 'game_id', NEW.game_id, 'points', NEW.points));
END$$
DELIMITER ;

-- Stored procedure to add a score safely (transactional)
DELIMITER $$
CREATE PROCEDURE `add_score` (
  IN p_player_id INT,
  IN p_game_id INT,
  IN p_points INT,
  IN p_recorded_by INT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Failed to add score';
  END;

  START TRANSACTION;
    INSERT INTO `scores` (`player_id`,`game_id`,`points`,`recorded_by`) VALUES (p_player_id, p_game_id, p_points, p_recorded_by);
  COMMIT;
END$$
DELIMITER ;

-- Sample seed data (safe minimal set)
INSERT IGNORE INTO `roles` (`id`,`name`) VALUES (1,'user'), (2,'admin');
INSERT IGNORE INTO `users` (`id`,`username`,`email`,`password_hash`,`role_id`) VALUES
  (1,'admin','admin@example.com','$2y$10$placeholderhash',2);

INSERT IGNORE INTO `teams` (`id`,`name`) VALUES (1,'Blue Team'), (2,'Red Team');
INSERT IGNORE INTO `players` (`id`,`team_id`,`display_name`,`email`) VALUES
  (1,1,'Alice','alice@example.com'),
  (2,2,'Bob','bob@example.com');

INSERT IGNORE INTO `games` (`id`,`name`,`scheduled_at`) VALUES
  (1,'Qualifier','2026-02-15 18:00:00');

-- Example of using stored procedure:
-- CALL add_score(1,1,10,1);

-- Helpful view: leaderboard
CREATE OR REPLACE VIEW `leaderboard` AS
SELECT p.id AS player_id, p.display_name, p.total_score, t.name AS team_name
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
ORDER BY p.total_score DESC;

-- Ensure basic privileges (note: run as admin user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON scoresafe.* TO 'app_user'@'localhost';

-- ...existing code...