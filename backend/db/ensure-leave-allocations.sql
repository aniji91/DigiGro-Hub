-- Run in Hostinger phpMyAdmin if Leave Allocation shows "Failed to load"
-- Select your live database first (e.g. u331715773_digigro_hub)

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
