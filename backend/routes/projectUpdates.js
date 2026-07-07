const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");
const { upsertProjectUpdateRow, deleteProjectUpdateRow } = require("../utils/dailyWorkSql");

const router = express.Router();
const FILE = dataPath("project_updates.json");
const PROJECTS_FILE = dataPath("projects.json");
const EMPLOYEES_FILE = dataPath("employees.json");

const MANAGE_ROLES = new Set(["superadmin", "admin", "product_manager"]);
const READ_ALL_ROLES = new Set(["superadmin", "admin", "product_manager", "hr"]);
const POINT_TYPES = new Set(["discussion", "status"]);
const TASK_STATUSES = new Set(["New", "Completed", "Carry forward"]);

function normalizeDueAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readUpdates() {
  return readData(FILE);
}

function writeUpdates(updates) {
  writeData(FILE, updates);
}

function readProjects() {
  return readData(PROJECTS_FILE);
}

function readEmployees() {
  return readData(EMPLOYEES_FILE);
}

function normalizeAssignedEmployee(project, assignedEmployeeId) {
  if (assignedEmployeeId === null || assignedEmployeeId === undefined || assignedEmployeeId === "") {
    return { assignedEmployeeId: null, assignedEmployeeName: null };
  }

  const id = Number(assignedEmployeeId);
  if (!Number.isFinite(id)) {
    return null;
  }

  const teamIds = (project.assignedEmployeeIds || []).map(Number);
  if (!teamIds.includes(id)) {
    return null;
  }

  const employee = readEmployees().find((item) => Number(item.id) === id);
  return {
    assignedEmployeeId: id,
    assignedEmployeeName: employee?.name || `Employee ${id}`,
  };
}

function canAccessProject(user, projectId) {
  if (READ_ALL_ROLES.has(user.role)) return true;
  if (user.role === "employee" && user.employeeId) {
    const project = readProjects().find((p) => p.id === projectId);
    return project && (project.assignedEmployeeIds || []).includes(user.employeeId);
  }
  return false;
}

function getAccessibleProjectIds(user) {
  const projects = readProjects();
  if (READ_ALL_ROLES.has(user.role)) {
    return projects.map((p) => p.id);
  }
  if (user.role === "employee" && user.employeeId) {
    return projects
      .filter((p) => (p.assignedEmployeeIds || []).includes(user.employeeId))
      .map((p) => p.id);
  }
  return [];
}

router.use(authenticate);

router.get("/", (req, res) => {
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;
  const accessibleIds = getAccessibleProjectIds(req.user);

  if (accessibleIds.length === 0) {
    return res.status(403).json({ error: "Access denied" });
  }

  let updates = readUpdates().filter((u) => accessibleIds.includes(u.projectId));

  if (projectId) {
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    updates = updates.filter((u) => u.projectId === projectId);
  }

  updates.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(updates);
});

router.post("/", async (req, res) => {
  const { projectId, date, type, content, taskStatus, dueAt, overdueNote, assignedEmployeeId } = req.body;

  if (!projectId || !date || !type || !content?.trim()) {
    return res.status(400).json({ error: "Project, date, type, and content are required" });
  }

  if (!POINT_TYPES.has(type)) {
    return res.status(400).json({ error: "Type must be discussion or status" });
  }

  if (type === "status" && !TASK_STATUSES.has(taskStatus)) {
    return res.status(400).json({ error: "Task status must be New, Completed, or Carry forward" });
  }

  const parsedProjectId = Number(projectId);
  if (!canAccessProject(req.user, parsedProjectId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const project = readProjects().find((p) => p.id === parsedProjectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  let assignment = { assignedEmployeeId: null, assignedEmployeeName: null };
  if (type === "status" && assignedEmployeeId !== undefined) {
    const normalized = normalizeAssignedEmployee(project, assignedEmployeeId);
    if (normalized === null) {
      return res.status(400).json({ error: "Assigned team member must belong to this project" });
    }
    assignment = normalized;
  }

  const updates = readUpdates();
  const now = new Date().toISOString();
  const created = {
    id: nextId(updates),
    projectId: parsedProjectId,
    projectName: project.name,
    date,
    type,
    content: content.trim(),
    taskStatus: type === "status" ? taskStatus : null,
    dueAt: type === "status" ? normalizeDueAt(dueAt) : null,
    overdueNote:
      type === "status" ? (overdueNote || "").trim() || null : null,
    assignedEmployeeId: type === "status" ? assignment.assignedEmployeeId : null,
    assignedEmployeeName: type === "status" ? assignment.assignedEmployeeName : null,
    statusUpdatedAt: type === "status" ? now : null,
    authorId: req.user.id,
    authorName: req.user.name,
    authorRole: req.user.role,
    createdAt: now,
  };

  updates.push(created);
  writeUpdates(updates);
  try {
    await upsertProjectUpdateRow(created);
  } catch (err) {
    console.warn(`Project update ${created.id} saved but SQL sync failed:`, err.message);
  }
  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const updates = readUpdates();
  const index = updates.findIndex((u) => u.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Update not found" });
  }

  const item = updates[index];

  if (!canAccessProject(req.user, item.projectId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const isAuthor = item.authorId === req.user.id;
  if (!isAuthor && !MANAGE_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: "You can only edit your own points" });
  }

  const { date, type, content, taskStatus, dueAt, overdueNote, assignedEmployeeId } = req.body;

  if (type && !POINT_TYPES.has(type)) {
    return res.status(400).json({ error: "Type must be discussion or status" });
  }

  const nextType = type ?? item.type;
  if (nextType === "status" && taskStatus !== undefined && !TASK_STATUSES.has(taskStatus)) {
    return res.status(400).json({ error: "Task status must be New, Completed, or Carry forward" });
  }
  if (nextType === "status" && taskStatus === undefined && !item.taskStatus) {
    return res.status(400).json({ error: "Task status is required for daily tasks" });
  }

  const nextTaskStatus =
    nextType === "status" ? (taskStatus ?? item.taskStatus ?? "New") : null;
  const statusChanged =
    nextType === "status" && taskStatus !== undefined && taskStatus !== item.taskStatus;
  const now = new Date().toISOString();

  let nextAssignment = {
    assignedEmployeeId: item.assignedEmployeeId ?? null,
    assignedEmployeeName: item.assignedEmployeeName ?? null,
  };
  if (nextType === "status" && assignedEmployeeId !== undefined) {
    const project = readProjects().find((p) => p.id === item.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const normalized = normalizeAssignedEmployee(project, assignedEmployeeId);
    if (normalized === null) {
      return res.status(400).json({ error: "Assigned team member must belong to this project" });
    }
    nextAssignment = normalized;
  } else if (nextType !== "status") {
    nextAssignment = { assignedEmployeeId: null, assignedEmployeeName: null };
  }

  updates[index] = {
    ...item,
    date: date ?? item.date,
    type: nextType,
    content: content !== undefined ? content.trim() : item.content,
    taskStatus: nextTaskStatus,
    dueAt:
      nextType === "status"
        ? dueAt !== undefined
          ? normalizeDueAt(dueAt)
          : item.dueAt ?? null
        : null,
    overdueNote:
      nextType === "status"
        ? overdueNote !== undefined
          ? (overdueNote || "").trim() || null
          : item.overdueNote ?? null
        : null,
    assignedEmployeeId: nextType === "status" ? nextAssignment.assignedEmployeeId : null,
    assignedEmployeeName: nextType === "status" ? nextAssignment.assignedEmployeeName : null,
    statusUpdatedAt:
      nextType === "status"
        ? statusChanged
          ? now
          : item.statusUpdatedAt || item.createdAt
        : null,
    updatedAt: now,
  };

  writeUpdates(updates);
  try {
    await upsertProjectUpdateRow(updates[index]);
  } catch (err) {
    console.warn(`Project update ${updates[index].id} saved but SQL sync failed:`, err.message);
  }
  res.json(updates[index]);
});

router.delete("/:id", async (req, res) => {
  const updates = readUpdates();
  const index = updates.findIndex((u) => u.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Update not found" });
  }

  const item = updates[index];

  if (!canAccessProject(req.user, item.projectId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const isAuthor = item.authorId === req.user.id;
  if (!isAuthor && !MANAGE_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: "You can only delete your own points" });
  }

  const deleted = updates.splice(index, 1)[0];
  writeUpdates(updates);
  try {
    await deleteProjectUpdateRow(deleted.id);
  } catch (err) {
    console.warn(`Project update ${deleted.id} deleted but SQL sync failed:`, err.message);
  }
  res.json(deleted);
});

module.exports = router;
