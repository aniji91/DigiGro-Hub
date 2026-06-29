CREATE TABLE IF NOT EXISTS app_collections (
  collection_name VARCHAR(100) NOT NULL PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  department VARCHAR(100) NULL,
  position VARCHAR(150) NULL,
  salary DECIMAL(12, 2) NULL,
  dob DATE NULL,
  joining_date DATE NULL,
  documents JSON NULL,
  emergency_contacts JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  employee_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id INT NOT NULL PRIMARY KEY,
  role_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT NULL,
  color VARCHAR(20) NULL,
  is_system TINYINT(1) DEFAULT 0,
  assignable_by JSON NULL,
  module_permissions JSON NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  company VARCHAR(200) NULL,
  industry VARCHAR(100) NULL,
  status VARCHAR(50) NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  client_name VARCHAR(200) NULL,
  client_id INT NULL,
  description TEXT NULL,
  status VARCHAR(50) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  assigned_employee_ids JSON NULL,
  owner_id INT NULL,
  project_type VARCHAR(50) NULL,
  existing_site_url TEXT NULL,
  reference_sites JSON NULL,
  suggestions TEXT NULL,
  target_audience TEXT NULL,
  page_scope TEXT NULL,
  tech_preferences TEXT NULL,
  documents JSON NULL,
  staging_details JSON NULL,
  production_details JSON NULL,
  external_crm_integrations JSON NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leaves (
  id INT NOT NULL PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(200) NULL,
  leave_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NULL,
  reason TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  INDEX idx_leaves_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_allocations (
  id INT NOT NULL PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(200) NOT NULL,
  year INT NOT NULL,
  annual_leave INT NOT NULL DEFAULT 0,
  sick_leave INT NOT NULL DEFAULT 0,
  personal_leave INT NOT NULL DEFAULT 0,
  unpaid_leave INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uk_leave_allocations_employee_year (employee_id, year),
  INDEX idx_leave_allocations_year (year),
  INDEX idx_leave_allocations_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
  id INT NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_type VARCHAR(100) NULL,
  description TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_logs (
  id INT NOT NULL PRIMARY KEY,
  user_id INT NULL,
  employee_id INT NULL,
  employee_name VARCHAR(200) NULL,
  role VARCHAR(50) NULL,
  project_id INT NULL,
  project_name VARCHAR(200) NULL,
  log_date DATE NOT NULL,
  hours_worked DECIMAL(5, 2) NOT NULL,
  work_description TEXT NOT NULL,
  progress VARCHAR(50) NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  INDEX idx_work_logs_employee_id (employee_id),
  INDEX idx_work_logs_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id INT NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  announcement_type VARCHAR(50) NULL,
  publish_date DATE NULL,
  expires_at DATE NULL,
  is_active TINYINT(1) DEFAULT 1,
  author_id INT NULL,
  author_name VARCHAR(200) NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_updates (
  id INT NOT NULL PRIMARY KEY,
  project_id INT NOT NULL,
  project_name VARCHAR(200) NULL,
  update_date DATE NOT NULL,
  update_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  task_status VARCHAR(50) NULL,
  author_id INT NULL,
  author_name VARCHAR(200) NULL,
  author_role VARCHAR(50) NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  INDEX idx_project_updates_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channels (
  id INT NOT NULL PRIMARY KEY,
  channel_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NULL,
  description TEXT NULL,
  project_id INT NULL,
  project_name VARCHAR(200) NULL,
  member_user_ids JSON NULL,
  dm_user_ids JSON NULL,
  is_all_employees TINYINT(1) DEFAULT 0,
  created_by INT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id INT NOT NULL PRIMARY KEY,
  channel_id INT NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(200) NULL,
  user_role VARCHAR(50) NULL,
  text TEXT NULL,
  message_type VARCHAR(50) NULL,
  mention_user_ids JSON NULL,
  mention_all TINYINT(1) DEFAULT 0,
  attachments JSON NULL,
  poll JSON NULL,
  gif_url TEXT NULL,
  drive_link TEXT NULL,
  reply_to_message_id INT NULL,
  reply_to JSON NULL,
  created_at DATETIME NULL,
  INDEX idx_messages_channel_id (channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS channel_reads (
  user_id INT NOT NULL,
  channel_id INT NOT NULL,
  last_read_at DATETIME NULL,
  last_read_message_id INT NULL,
  PRIMARY KEY (user_id, channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_presence (
  user_id INT NOT NULL PRIMARY KEY,
  last_seen_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_onboarding (
  id INT NOT NULL PRIMARY KEY,
  project_id INT NOT NULL,
  project_name VARCHAR(200) NULL,
  employee_id INT NOT NULL,
  status VARCHAR(50) NULL,
  steps JSON NULL,
  created_at DATETIME NULL,
  completed_at DATETIME NULL,
  INDEX idx_project_onboarding_project_id (project_id),
  INDEX idx_project_onboarding_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
