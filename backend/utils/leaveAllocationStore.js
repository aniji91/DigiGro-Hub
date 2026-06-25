const { getPool, isMysqlEnabled } = require("../db/pool");

const ENSURE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS leave_allocations (
  id INT NOT NULL PRIMARY KEY,
  employee_id INT NOT NULL,
  employee_name VARCHAR(200) NOT NULL,
  \`year\` INT NOT NULL,
  annual_leave INT NOT NULL DEFAULT 0,
  sick_leave INT NOT NULL DEFAULT 0,
  personal_leave INT NOT NULL DEFAULT 0,
  unpaid_leave INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uk_leave_allocations_employee_year (employee_id, \`year\`),
  INDEX idx_leave_allocations_year (\`year\`),
  INDEX idx_leave_allocations_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

let tableReady = false;
let migrationDone = false;

async function ensureTable() {
  const pool = getPool();
  try {
    await pool.query("SELECT 1 FROM leave_allocations LIMIT 1");
    tableReady = true;
    return;
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }

  await pool.query(ENSURE_TABLE_SQL);
  tableReady = true;
}

async function ensureReady() {
  if (!tableReady) {
    await ensureTable();
  }
}

function rowToAllocation(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    year: row.year,
    annualLeave: row.annual_leave,
    sickLeave: row.sick_leave,
    personalLeave: row.personal_leave,
    unpaidLeave: row.unpaid_leave,
    notes: row.notes || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

function allocationToRow(item) {
  return {
    id: item.id,
    employee_id: item.employeeId,
    employee_name: item.employeeName,
    year: item.year,
    annual_leave: item.annualLeave ?? 0,
    sick_leave: item.sickLeave ?? 0,
    personal_leave: item.personalLeave ?? 0,
    unpaid_leave: item.unpaidLeave ?? 0,
    notes: item.notes || "",
    created_at: item.createdAt || new Date(),
    updated_at: item.updatedAt || new Date(),
  };
}

async function getAllocationsByYear(year) {
  await ensureReady();
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM leave_allocations WHERE `year` = ? ORDER BY employee_name",
    [year]
  );
  return rows.map(rowToAllocation);
}

async function getAllocationById(id) {
  await ensureReady();
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM leave_allocations WHERE id = ?", [id]);
  return rows.length ? rowToAllocation(rows[0]) : null;
}

async function findByEmployeeAndYear(employeeId, year) {
  await ensureReady();
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM leave_allocations WHERE employee_id = ? AND `year` = ?",
    [employeeId, year]
  );
  return rows.length ? rowToAllocation(rows[0]) : null;
}

async function getNextId() {
  await ensureReady();
  const pool = getPool();
  const [rows] = await pool.query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM leave_allocations");
  return Number(rows[0].next_id);
}

async function insertAllocation(item) {
  await ensureReady();
  const pool = getPool();
  const row = allocationToRow(item);
  await pool.query(
    `INSERT INTO leave_allocations
     (id, employee_id, employee_name, \`year\`, annual_leave, sick_leave, personal_leave, unpaid_leave, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.employee_id,
      row.employee_name,
      row.year,
      row.annual_leave,
      row.sick_leave,
      row.personal_leave,
      row.unpaid_leave,
      row.notes,
      row.created_at,
      row.updated_at,
    ]
  );
  return getAllocationById(row.id);
}

async function updateAllocation(id, item) {
  await ensureReady();
  const pool = getPool();
  const row = allocationToRow({ ...item, id, updatedAt: new Date().toISOString() });
  await pool.query(
    `UPDATE leave_allocations
     SET employee_id = ?, employee_name = ?, \`year\` = ?,
         annual_leave = ?, sick_leave = ?, personal_leave = ?, unpaid_leave = ?,
         notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      row.employee_id,
      row.employee_name,
      row.year,
      row.annual_leave,
      row.sick_leave,
      row.personal_leave,
      row.unpaid_leave,
      row.notes,
      row.updated_at,
      id,
    ]
  );
  return getAllocationById(id);
}

async function deleteAllocation(id) {
  await ensureReady();
  const existing = await getAllocationById(id);
  if (!existing) return null;
  const pool = getPool();
  await pool.query("DELETE FROM leave_allocations WHERE id = ?", [id]);
  return existing;
}

async function migrateFromAppCollections() {
  if (!isMysqlEnabled() || migrationDone) return 0;

  await ensureReady();
  migrationDone = true;

  const pool = getPool();
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM leave_allocations");
  if (Number(countRows[0].total) > 0) return 0;

  try {
    const [collectionRows] = await pool.query(
      "SELECT data FROM app_collections WHERE collection_name = 'leave_allocations'"
    );
    if (!collectionRows.length) return 0;

    const data =
      typeof collectionRows[0].data === "string"
        ? JSON.parse(collectionRows[0].data)
        : collectionRows[0].data;

    if (!Array.isArray(data) || data.length === 0) return 0;

    for (const item of data) {
      const row = allocationToRow(item);
      await pool.query(
        `INSERT IGNORE INTO leave_allocations
         (id, employee_id, employee_name, \`year\`, annual_leave, sick_leave, personal_leave, unpaid_leave, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.employee_id,
          row.employee_name,
          row.year,
          row.annual_leave,
          row.sick_leave,
          row.personal_leave,
          row.unpaid_leave,
          row.notes,
          row.created_at,
          row.updated_at,
        ]
      );
    }

    return data.length;
  } catch (err) {
    console.error("leave_allocations migration from app_collections failed:", err.message);
    return 0;
  }
}

async function initLeaveAllocations() {
  await ensureReady();
  return migrateFromAppCollections();
}

module.exports = {
  isMysqlEnabled,
  ensureTable,
  initLeaveAllocations,
  getAllocationsByYear,
  getAllocationById,
  findByEmployeeAndYear,
  getNextId,
  insertAllocation,
  updateAllocation,
  deleteAllocation,
  migrateFromAppCollections,
};
