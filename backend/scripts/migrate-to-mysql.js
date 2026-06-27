require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { getDbConfig } = require("../db/pool");

const DATA_DIR = path.join(__dirname, "..", "data");
const SCHEMA_FILE = path.join(__dirname, "..", "db", "schema.sql");

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function runSchema(connection) {
  const sql = fs.readFileSync(SCHEMA_FILE, "utf-8");
  const statements = sql
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function importCollections(connection) {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json") && file !== "leave_allocations.json");
  for (const file of files) {
    const key = path.basename(file, ".json");
    const data = readJsonFile(path.join(DATA_DIR, file));
    await connection.query(
      `INSERT INTO app_collections (collection_name, data)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [key, JSON.stringify(data)]
    );
    console.log(`Imported collection: ${key}`);
  }
  return files.length;
}

function toDate(value) {
  if (!value) return null;
  return value.slice(0, 10);
}

async function syncNormalizedTables(connection) {
  const collections = {};
  const [rows] = await connection.query("SELECT collection_name, data FROM app_collections");
  rows.forEach((row) => {
    collections[row.collection_name] =
      typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  });

  if (Array.isArray(collections.employees)) {
    await connection.query("DELETE FROM employees");
    for (const item of collections.employees) {
      await connection.query(
        `INSERT INTO employees
         (id, name, email, department, position, salary, dob, joining_date, documents, emergency_contacts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.email,
          item.department || null,
          item.position || null,
          item.salary ?? null,
          toDate(item.dob),
          toDate(item.joiningDate),
          JSON.stringify(item.documents || []),
          JSON.stringify(item.emergencyContacts || []),
        ]
      );
    }
    console.log(`Synced employees: ${collections.employees.length}`);
  }

  if (Array.isArray(collections.users)) {
    await connection.query("DELETE FROM users");
    for (const item of collections.users) {
      await connection.query(
        `INSERT INTO users (id, username, password_hash, role, name, employee_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, item.username, item.passwordHash, item.role, item.name, item.employeeId || null]
      );
    }
    console.log(`Synced users: ${collections.users.length}`);
  }

  if (Array.isArray(collections.roles)) {
    await connection.query("DELETE FROM roles");
    for (const item of collections.roles) {
      await connection.query(
        `INSERT INTO roles
         (id, role_key, label, description, color, is_system, assignable_by, module_permissions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.key,
          item.label,
          item.description || null,
          item.color || null,
          item.isSystem ? 1 : 0,
          JSON.stringify(item.assignableBy || []),
          JSON.stringify(item.modulePermissions || {}),
          item.createdAt || null,
        ]
      );
    }
    console.log(`Synced roles: ${collections.roles.length}`);
  }

  if (Array.isArray(collections.clients)) {
    await connection.query("DELETE FROM clients");
    for (const item of collections.clients) {
      await connection.query(
        `INSERT INTO clients (id, name, email, phone, company, industry, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.email || null,
          item.phone || null,
          item.company || null,
          item.industry || null,
          item.status || null,
          item.createdAt || null,
        ]
      );
    }
    console.log(`Synced clients: ${collections.clients.length}`);
  }

  if (Array.isArray(collections.projects)) {
    await connection.query("DELETE FROM projects");
    for (const item of collections.projects) {
      await connection.query(
        `INSERT INTO projects
         (id, name, client_name, client_id, description, status, start_date, end_date,
          assigned_employee_ids, project_type, existing_site_url, reference_sites, suggestions,
          target_audience, page_scope, tech_preferences, documents, staging_details,
          production_details, external_crm_integrations, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.clientName || null,
          item.clientId || null,
          item.description || null,
          item.status || null,
          toDate(item.startDate),
          toDate(item.endDate),
          JSON.stringify(item.assignedEmployeeIds || []),
          item.projectType || null,
          item.existingSiteUrl || null,
          JSON.stringify(item.referenceSites || []),
          item.suggestions || null,
          item.targetAudience || null,
          item.pageScope || null,
          item.techPreferences || null,
          JSON.stringify(item.documents || []),
          JSON.stringify(item.stagingDetails || null),
          JSON.stringify(item.productionDetails || null),
          JSON.stringify(item.externalCrmIntegrations || []),
          item.createdAt || null,
        ]
      );
    }
    console.log(`Synced projects: ${collections.projects.length}`);
  }

  if (Array.isArray(collections.leaves)) {
    await connection.query("DELETE FROM leaves");
    for (const item of collections.leaves) {
      await connection.query(
        `INSERT INTO leaves
         (id, employee_id, employee_name, leave_type, start_date, end_date, status, reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.employeeId,
          item.employeeName || null,
          item.type,
          toDate(item.startDate),
          toDate(item.endDate),
          item.status || null,
          item.reason || null,
          item.createdAt || null,
          item.updatedAt || null,
        ]
      );
    }
    console.log(`Synced leaves: ${collections.leaves.length}`);
  }

  if (Array.isArray(collections.leave_allocations)) {
    await connection.query("DELETE FROM leave_allocations");
    for (const item of collections.leave_allocations) {
      await connection.query(
        `INSERT INTO leave_allocations
         (id, employee_id, employee_name, year, annual_leave, sick_leave, personal_leave, unpaid_leave, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.employeeId,
          item.employeeName,
          item.year,
          Number(item.annualLeave) || 0,
          Number(item.sickLeave) || 0,
          Number(item.personalLeave) || 0,
          Number(item.unpaidLeave) || 0,
          item.notes || null,
          item.createdAt || null,
          item.updatedAt || null,
        ]
      );
    }
    console.log(`Synced leave_allocations: ${collections.leave_allocations.length}`);
  }

  if (Array.isArray(collections.holidays)) {
    await connection.query("DELETE FROM holidays");
    for (const item of collections.holidays) {
      await connection.query(
        `INSERT INTO holidays (id, name, holiday_date, holiday_type, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          toDate(item.date),
          item.type || null,
          item.description || null,
          item.createdAt || null,
          item.updatedAt || null,
        ]
      );
    }
    console.log(`Synced holidays: ${collections.holidays.length}`);
  }

  if (Array.isArray(collections.work_logs)) {
    await connection.query("DELETE FROM work_logs");
    for (const item of collections.work_logs) {
      await connection.query(
        `INSERT INTO work_logs
         (id, user_id, employee_id, employee_name, role, project_id, project_name, log_date,
          hours_worked, work_description, progress, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.userId || null,
          item.employeeId || null,
          item.employeeName || null,
          item.role || null,
          item.projectId || null,
          item.projectName || null,
          toDate(item.date),
          item.hoursWorked,
          item.workDescription,
          item.progress || null,
          item.createdAt || null,
          item.updatedAt || null,
        ]
      );
    }
    console.log(`Synced work_logs: ${collections.work_logs.length}`);
  }

  if (Array.isArray(collections.announcements)) {
    await connection.query("DELETE FROM announcements");
    for (const item of collections.announcements) {
      await connection.query(
        `INSERT INTO announcements
         (id, title, body, announcement_type, publish_date, expires_at, is_active, author_id, author_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.title,
          item.body,
          item.type || null,
          toDate(item.publishDate),
          toDate(item.expiresAt),
          item.isActive === false ? 0 : 1,
          item.authorId || null,
          item.authorName || null,
          item.createdAt || null,
          item.updatedAt || null,
        ]
      );
    }
    console.log(`Synced announcements: ${collections.announcements.length}`);
  }

  if (Array.isArray(collections.project_updates)) {
    await connection.query("DELETE FROM project_updates");
    for (const item of collections.project_updates) {
      await connection.query(
        `INSERT INTO project_updates
         (id, project_id, project_name, update_date, update_type, content, task_status, author_id, author_name, author_role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.projectId,
          item.projectName || null,
          toDate(item.date),
          item.type,
          item.content,
          item.taskStatus || null,
          item.authorId || null,
          item.authorName || null,
          item.authorRole || null,
          item.createdAt || null,
          item.updatedAt || null,
        ]
      );
    }
    console.log(`Synced project_updates: ${collections.project_updates.length}`);
  }

  if (Array.isArray(collections.channels)) {
    await connection.query("DELETE FROM channels");
    for (const item of collections.channels) {
      await connection.query(
        `INSERT INTO channels
         (id, channel_type, name, description, project_id, project_name, member_user_ids, dm_user_ids,
          is_all_employees, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.type,
          item.name || null,
          item.description || null,
          item.projectId || null,
          item.projectName || null,
          JSON.stringify(item.memberUserIds || []),
          JSON.stringify(item.dmUserIds || []),
          item.isAllEmployees ? 1 : 0,
          item.createdBy || null,
          item.createdAt || null,
        ]
      );
    }
    console.log(`Synced channels: ${collections.channels.length}`);
  }

  if (Array.isArray(collections.messages)) {
    await connection.query("DELETE FROM messages");
    for (const item of collections.messages) {
      await connection.query(
        `INSERT INTO messages
         (id, channel_id, user_id, user_name, user_role, text, message_type, mention_user_ids, mention_all,
          attachments, poll, gif_url, drive_link, reply_to_message_id, reply_to, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.channelId,
          item.userId,
          item.userName || null,
          item.userRole || null,
          item.text || null,
          item.messageType || null,
          JSON.stringify(item.mentionUserIds || []),
          item.mentionAll ? 1 : 0,
          JSON.stringify(item.attachments || []),
          item.poll ? JSON.stringify(item.poll) : null,
          item.gifUrl || null,
          item.driveLink || null,
          item.replyToMessageId || null,
          item.replyTo ? JSON.stringify(item.replyTo) : null,
          item.createdAt || null,
        ]
      );
    }
    console.log(`Synced messages: ${collections.messages.length}`);
  }

  if (Array.isArray(collections.channel_reads)) {
    await connection.query("DELETE FROM channel_reads");
    for (const item of collections.channel_reads) {
      await connection.query(
        `INSERT INTO channel_reads (user_id, channel_id, last_read_at, last_read_message_id)
         VALUES (?, ?, ?, ?)`,
        [item.userId, item.channelId, item.lastReadAt || null, item.lastReadMessageId || null]
      );
    }
    console.log(`Synced channel_reads: ${collections.channel_reads.length}`);
  }

  if (Array.isArray(collections.user_presence)) {
    await connection.query("DELETE FROM user_presence");
    for (const item of collections.user_presence) {
      await connection.query(
        `INSERT INTO user_presence (user_id, last_seen_at) VALUES (?, ?)`,
        [item.userId, item.lastSeenAt]
      );
    }
    console.log(`Synced user_presence: ${collections.user_presence.length}`);
  }

  if (Array.isArray(collections.project_onboarding)) {
    await connection.query("DELETE FROM project_onboarding");
    for (const item of collections.project_onboarding) {
      await connection.query(
        `INSERT INTO project_onboarding
         (id, project_id, project_name, employee_id, status, steps, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.projectId,
          item.projectName || null,
          item.employeeId,
          item.status || null,
          JSON.stringify(item.steps || []),
          item.createdAt || null,
          item.completedAt || null,
        ]
      );
    }
    console.log(`Synced project_onboarding: ${collections.project_onboarding.length}`);
  }
}

async function main() {
  const config = getDbConfig();
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await connection.query(`USE \`${config.database}\``);
    await runSchema(connection);
    const count = await importCollections(connection);
    await syncNormalizedTables(connection);
    console.log(`\nMySQL setup complete for database "${config.database}" (${count} collections imported).`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
