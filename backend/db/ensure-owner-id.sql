-- Run once in Hostinger phpMyAdmin if projects table exists without owner_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id INT NULL AFTER assigned_employee_ids;
