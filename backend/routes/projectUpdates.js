const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");

const router = express.Router();
const FILE = dataPath("project_updates.json");
const PROJECTS_FILE = dataPath("projects.json");

const MANAGE_ROLES = new Set(["superadmin", "admin", "product_manager"]);
const POINT_TYPES = new Set(["discussion", "status"]);

function readUpdates() {
  return readData(FILE);
}

function writeUpdates(updates) {
  writeData(FILE, updates);
}

function readProjects() {
  return readData(PROJECTS_FILE);
}

function canAccessProject(user, projectId) {
  if (MANAGE_ROLES.has(user.role)) return true;
  if (user.role === "employee" && user.employeeId) {
    const project = readProjects().find((p) => p.id === projectId);
    return project && (project.assignedEmployeeIds || []).includes(user.employeeId);
  }
  return false;
}

function getAccessibleProjectIds(user) {
  const projects = readProjects();
  if (MANAGE_ROLES.has(user.role)) {
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

router.post("/", (req, res) => {
  const { projectId, date, type, content } = req.body;

  if (!projectId || !date || !type || !content?.trim()) {
    return res.status(400).json({ error: "Project, date, type, and content are required" });
  }

  if (!POINT_TYPES.has(type)) {
    return res.status(400).json({ error: "Type must be discussion or status" });
  }

  const parsedProjectId = Number(projectId);
  if (!canAccessProject(req.user, parsedProjectId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const project = readProjects().find((p) => p.id === parsedProjectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const updates = readUpdates();
  const created = {
    id: nextId(updates),
    projectId: parsedProjectId,
    projectName: project.name,
    date,
    type,
    content: content.trim(),
    authorId: req.user.id,
    authorName: req.user.name,
    authorRole: req.user.role,
    createdAt: new Date().toISOString(),
  };

  updates.push(created);
  writeUpdates(updates);
  res.status(201).json(created);
});

router.put("/:id", (req, res) => {
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

  const { date, type, content } = req.body;

  if (type && !POINT_TYPES.has(type)) {
    return res.status(400).json({ error: "Type must be discussion or status" });
  }

  updates[index] = {
    ...item,
    date: date ?? item.date,
    type: type ?? item.type,
    content: content !== undefined ? content.trim() : item.content,
    updatedAt: new Date().toISOString(),
  };

  writeUpdates(updates);
  res.json(updates[index]);
});

router.delete("/:id", (req, res) => {
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
  res.json(deleted);
});

module.exports = router;
