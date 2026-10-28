-- SpendWise database schema (MySQL 8+)
CREATE DATABASE IF NOT EXISTS spendwise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE spendwise;

-- Users --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  currency       CHAR(3)      NOT NULL DEFAULT 'INR',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Categories (per user, income or expense) ---------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(60)  NOT NULL,
  type        ENUM('income','expense') NOT NULL,
  color       VARCHAR(20)  NOT NULL DEFAULT 'slate',
  icon        VARCHAR(16)  NOT NULL DEFAULT '💸',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_user_name_type (user_id, name, type),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recurring rules (rent, salary, subscriptions) ----------------------
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  category_id    INT UNSIGNED NOT NULL,
  type           ENUM('income','expense') NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  description    VARCHAR(190) NOT NULL,
  frequency      ENUM('daily','weekly','monthly','yearly') NOT NULL DEFAULT 'monthly',
  next_run_date  DATE NOT NULL,
  end_date       DATE NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recurring_due (is_active, next_run_date),
  CONSTRAINT fk_recurring_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recurring_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_recurring_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- Transactions -------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  category_id     INT UNSIGNED NOT NULL,
  recurring_id    INT UNSIGNED NULL,
  type            ENUM('income','expense') NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  description     VARCHAR(190) NOT NULL,
  note            VARCHAR(500) NULL,
  payment_method  ENUM('cash','upi','card','bank','other') NOT NULL DEFAULT 'upi',
  txn_date        DATE NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_txn_user_date (user_id, txn_date),
  KEY idx_txn_user_cat_date (user_id, category_id, txn_date),
  KEY idx_txn_user_type_date (user_id, type, txn_date),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_txn_recurring FOREIGN KEY (recurring_id) REFERENCES recurring_transactions(id) ON DELETE SET NULL,
  CONSTRAINT chk_txn_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- Monthly budgets (one per category per month) -----------------------
CREATE TABLE IF NOT EXISTS budgets (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  category_id      INT UNSIGNED NOT NULL,
  month            DATE NOT NULL COMMENT 'First day of the month',
  amount           DECIMAL(12,2) NOT NULL,
  alert_threshold  TINYINT UNSIGNED NOT NULL DEFAULT 80 COMMENT 'Percent at which to warn',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget (user_id, category_id, month),
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_budget_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  CONSTRAINT chk_budget_amount CHECK (amount > 0),
  CONSTRAINT chk_budget_threshold CHECK (alert_threshold BETWEEN 1 AND 100)
) ENGINE=InnoDB;

-- Savings goals ------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_goals (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  name           VARCHAR(100) NOT NULL,
  icon           VARCHAR(16)  NOT NULL DEFAULT '🎯',
  color          VARCHAR(20)  NOT NULL DEFAULT 'teal',
  target_amount  DECIMAL(12,2) NOT NULL,
  saved_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  deadline       DATE NULL,
  status         ENUM('active','completed') NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goal_user (user_id, status),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_goal_target CHECK (target_amount > 0)
) ENGINE=InnoDB;

-- Goal contributions (history of every deposit) ----------------------
CREATE TABLE IF NOT EXISTS goal_contributions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_id         INT UNSIGNED NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  note            VARCHAR(190) NULL,
  contributed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contrib_goal (goal_id),
  CONSTRAINT fk_contrib_goal FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
) ENGINE=InnoDB;
