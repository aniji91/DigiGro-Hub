const { getPool, isMysqlEnabled } = require("../db/pool");
const { readData, dataPath } = require("./jsonStore");

function toIsoDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toMysqlDatetime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function mapWorkLogRow(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    employeeId: row.employee_id ?? null,
    employeeName: row.employee_name || "",
    role: row.role || null,
    projectId: row.project_id ?? null,
    projectName: row.project_name || "",
    date: toIsoDate(row.log_date),
    hoursWorked: Number(row.hours_worked),
    workDescription: row.work_description,
    progress: row.progress || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapProjectUpdateRow(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name || "",
    date: toIsoDate(row.update_date),
    type: row.update_type,
    content: row.content,
    taskStatus: row.task_status || null,
    dueAt: row.due_at || null,
    overdueNote: row.overdue_note || null,
    assignedEmployeeId: row.assigned_employee_id ?? null,
    assignedEmployeeName: row.assigned_employee_name || null,
    authorId: row.author_id ?? null,
    authorName: row.author_name || "",
    authorRole: row.author_role || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function getAccessibleProjectIds(user) {
  const projects = readData(dataPath("projects.json"));
  const readAll = ["superadmin", "admin", "product_manager", "hr"].includes(user.role);
  if (readAll) return projects.map((p) => p.id);
  if (user.role === "employee" && user.employeeId != null) {
    const employeeId = Number(user.employeeId);
    return projects
      .filter((p) =>
        (p.assignedEmployeeIds || []).some((id) => Number(id) === employeeId)
      )
      .map((p) => p.id);
  }
  return [];
}

function sortProjectUpdates(updates) {
  return [...updates].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function sortWorkLogs(logs) {
  return [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function mergeById(primary, secondary) {
  const seen = new Set(primary.map((item) => item.id));
  const merged = [...primary];
  for (const item of secondary) {
    if (!seen.has(item.id)) {
      merged.push(item);
      seen.add(item.id);
    }
  }
  return merged;
}

async function upsertWorkLogRow(item) {
  if (!isMysqlEnabled() || !item?.id) return;

  const logDate = toIsoDate(item.date);
  const workDescription = item.workDescription != null ? String(item.workDescription) : "";
  if (!logDate || !workDescription) return;

  const pool = getPool();
  await pool.query(
    `INSERT INTO work_logs
     (id, user_id, employee_id, employee_name, role, project_id, project_name, log_date,
      hours_worked, work_description, progress, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       employee_id = VALUES(employee_id),
       employee_name = VALUES(employee_name),
       role = VALUES(role),
       project_id = VALUES(project_id),
       project_name = VALUES(project_name),
       log_date = VALUES(log_date),
       hours_worked = VALUES(hours_worked),
       work_description = VALUES(work_description),
       progress = VALUES(progress),
       updated_at = VALUES(updated_at)`,
    [
      item.id,
      item.userId || null,
      item.employeeId || null,
      item.employeeName || null,
      item.role || null,
      item.projectId || null,
      item.projectName || null,
      logDate,
      Number(item.hoursWorked ?? 0),
      workDescription,
      item.progress || null,
      toMysqlDatetime(item.createdAt),
      toMysqlDatetime(item.updatedAt),
    ]
  );
}

async function deleteWorkLogRow(id) {
  if (!isMysqlEnabled()) return;
  await getPool().query("DELETE FROM work_logs WHERE id = ?", [Number(id)]);
}

async function upsertProjectUpdateRow(item) {
  if (!isMysqlEnabled() || !item?.id || !item?.projectId) return;

  const updateDate = toIsoDate(item.date);
  const content = item.content != null ? String(item.content).trim() : "";
  const updateType = item.type ? String(item.type) : "";
  if (!updateDate || !content || !updateType) return;

  const pool = getPool();
  await pool.query(
    `INSERT INTO project_updates
     (id, project_id, project_name, update_date, update_type, content, task_status, due_at,
      overdue_note, assigned_employee_id, assigned_employee_name, author_id, author_name, author_role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       project_id = VALUES(project_id),
       project_name = VALUES(project_name),
       update_date = VALUES(update_date),
       update_type = VALUES(update_type),
       content = VALUES(content),
       task_status = VALUES(task_status),
       due_at = VALUES(due_at),
       overdue_note = VALUES(overdue_note),
       assigned_employee_id = VALUES(assigned_employee_id),
       assigned_employee_name = VALUES(assigned_employee_name),
       author_id = VALUES(author_id),
       author_name = VALUES(author_name),
       author_role = VALUES(author_role),
       updated_at = VALUES(updated_at)`,
    [
      item.id,
      item.projectId,
      item.projectName || null,
      updateDate,
      updateType,
      content,
      item.taskStatus || null,
      toMysqlDatetime(item.dueAt),
      item.overdueNote || null,
      item.assignedEmployeeId || null,
      item.assignedEmployeeName || null,
      item.authorId || null,
      item.authorName || null,
      item.authorRole || null,
      toMysqlDatetime(item.createdAt),
      toMysqlDatetime(item.updatedAt),
    ]
  );
}

async function deleteProjectUpdateRow(id) {
  if (!isMysqlEnabled()) return;
  await getPool().query("DELETE FROM project_updates WHERE id = ?", [Number(id)]);
}

async function ensureDailyWorkTablesSynced() {
  if (!isMysqlEnabled()) return;

  const pool = getPool();
  const workLogs = readData(dataPath("work_logs.json"));
  const updates = readData(dataPath("project_updates.json"));
  const [[workLogCount]] = await pool.query("SELECT COUNT(*) AS count FROM work_logs");
  const [[updateCount]] = await pool.query("SELECT COUNT(*) AS count FROM project_updates");

  if (Array.isArray(workLogs) && workLogs.length > Number(workLogCount.count)) {
    for (const item of workLogs) {
      try {
        await upsertWorkLogRow(item);
      } catch (err) {
        console.warn(`Lazy-sync work log ${item?.id} failed: ${err.message}`);
      }
    }
  }

  if (Array.isArray(updates) && updates.length > Number(updateCount.count)) {
    for (const item of updates) {
      try {
        await upsertProjectUpdateRow(item);
      } catch (err) {
        console.warn(`Lazy-sync project update ${item?.id} failed: ${err.message}`);
      }
    }
  }
}

async function syncDailyWorkCollectionsToSql() {
  if (!isMysqlEnabled()) return;

  const workLogs = readData(dataPath("work_logs.json"));
  const updates = readData(dataPath("project_updates.json"));
  let syncedLogs = 0;
  let syncedUpdates = 0;
  let skipped = 0;

  if (Array.isArray(workLogs)) {
    for (const item of workLogs) {
      try {
        await upsertWorkLogRow(item);
        syncedLogs += 1;
      } catch (err) {
        skipped += 1;
        console.warn(`Skipped work log ${item?.id}: ${err.message}`);
      }
    }
  }

  if (Array.isArray(updates)) {
    for (const item of updates) {
      try {
        await upsertProjectUpdateRow(item);
        syncedUpdates += 1;
      } catch (err) {
        skipped += 1;
        console.warn(`Skipped project update ${item?.id}: ${err.message}`);
      }
    }
  }

  console.log(
    `Synced daily work tables: ${syncedLogs} work log(s), ${syncedUpdates} project update(s)${
      skipped ? `, ${skipped} skipped` : ""
    }`
  );
}

async function loadDailyWorkFromSql(user, filters = {}) {
  if (!isMysqlEnabled()) return null;

  await ensureDailyWorkTablesSynced();

  const pool = getPool();
  const { projectId, date, employeeId } = filters;
  const accessibleProjectIds = getAccessibleProjectIds(user);

  const workLogWhere = [];
  const workLogParams = [];

  if (user.role === "employee" && user.employeeId) {
    workLogWhere.push("employee_id = ?");
    workLogParams.push(user.employeeId);
  }

  if (projectId === "none") {
    workLogWhere.push("project_id IS NULL");
  } else if (projectId) {
    workLogWhere.push("project_id = ?");
    workLogParams.push(Number(projectId));
  }

  if (date) {
    workLogWhere.push("log_date = ?");
    workLogParams.push(date);
  }

  if (employeeId && user.role !== "employee") {
    workLogWhere.push("(employee_id = ? OR user_id = ?)");
    workLogParams.push(Number(employeeId), Number(employeeId));
  }

  const workLogSql = `SELECT * FROM work_logs${
    workLogWhere.length ? ` WHERE ${workLogWhere.join(" AND ")}` : ""
  } ORDER BY log_date DESC, id DESC`;

  const [workLogRows] = await pool.query(workLogSql, workLogParams);
  let workLogs = workLogRows.map(mapWorkLogRow);

  if (user.role === "employee" && accessibleProjectIds.length === 0) {
    workLogs = [];
  }

  let projectUpdates = [];
  if (accessibleProjectIds.length > 0) {
    const updateWhere = ["project_id IN (?)"];
    const updateParams = [accessibleProjectIds];

    if (projectId && projectId !== "none") {
      updateWhere.push("project_id = ?");
      updateParams.push(Number(projectId));
    } else if (projectId === "none") {
      projectUpdates = [];
      return { workLogs, projectUpdates };
    }

    if (date) {
      updateWhere.push("update_date = ?");
      updateParams.push(date);
    }

    if (employeeId && user.role !== "employee") {
      updateWhere.push("author_id = ?");
      updateParams.push(Number(employeeId));
    }

    const updateSql = `SELECT * FROM project_updates WHERE ${updateWhere.join(" AND ")} ORDER BY update_date DESC, id DESC`;
    const [updateRows] = await pool.query(updateSql, updateParams);
    projectUpdates = updateRows.map(mapProjectUpdateRow);
  }

  return { workLogs, projectUpdates };
}

function loadDailyWorkFromCollections(user, filters = {}) {
  const { projectId, date, employeeId } = filters;
  let workLogs = readData(dataPath("work_logs.json"));
  let projectUpdates = readData(dataPath("project_updates.json"));

  if (user.role === "employee") {
    workLogs = workLogs.filter(
      (log) =>
        (log.userId != null && log.userId === user.id) ||
        (user.employeeId != null && log.employeeId === user.employeeId)
    );
  }

  const accessibleProjectIds = getAccessibleProjectIds(user);
  if (accessibleProjectIds.length === 0) {
    projectUpdates = [];
  } else {
    projectUpdates = projectUpdates.filter((u) => accessibleProjectIds.includes(u.projectId));
  }

  if (projectId === "none") {
    workLogs = workLogs.filter((log) => log.projectId == null);
    projectUpdates = [];
  } else if (projectId) {
    const pid = Number(projectId);
    workLogs = workLogs.filter((log) => log.projectId === pid);
    projectUpdates = projectUpdates.filter((u) => u.projectId === pid);
  }

  if (date) {
    workLogs = workLogs.filter((log) => log.date === date);
    projectUpdates = projectUpdates.filter((u) => u.date === date);
  }

  if (employeeId && user.role !== "employee") {
    const id = Number(employeeId);
    workLogs = workLogs.filter((log) => log.userId === id || log.employeeId === id);
    projectUpdates = projectUpdates.filter((u) => u.authorId === id);
  }

  workLogs.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  projectUpdates.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return { workLogs, projectUpdates };
}

async function loadDailyWork(user, filters = {}) {
  const fromCollections = loadDailyWorkFromCollections(user, filters);

  if (!isMysqlEnabled()) return fromCollections;

  try {
    const fromSql = await loadDailyWorkFromSql(user, filters);
    if (!fromSql) return fromCollections;

    const workLogs = fromSql.workLogs.length > 0 ? fromSql.workLogs : fromCollections.workLogs;
    const projectUpdates = sortProjectUpdates(
      mergeById(fromSql.projectUpdates, fromCollections.projectUpdates)
    );

    return {
      workLogs: sortWorkLogs(workLogs),
      projectUpdates,
    };
  } catch (err) {
    console.warn("Daily work SQL read failed, using collections:", err.message);
  }
  return fromCollections;
}

module.exports = {
  upsertWorkLogRow,
  deleteWorkLogRow,
  upsertProjectUpdateRow,
  deleteProjectUpdateRow,
  syncDailyWorkCollectionsToSql,
  loadDailyWork,
};
