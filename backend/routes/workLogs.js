const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");
const { canLogWork, tryAutoCompleteStep } = require("../utils/projectOnboarding");

const router = express.Router();
const FILE = dataPath("work_logs.json");
const PROJECTS_FILE = dataPath("projects.json");

const LOG_CREATORS = new Set(["employee", "product_manager", "hr"]);

function readLogs() {
  return readData(FILE);
}

function writeLogs(logs) {
  writeData(FILE, logs);
}

function isAssignedToProject(employeeId, projectId) {
  const projects = readData(PROJECTS_FILE);
  const project = projects.find((p) => p.id === projectId);
  return project && (project.assignedEmployeeIds || []).includes(employeeId);
}

function isLogAuthor(log, user) {
  if (log.userId != null) return log.userId === user.id;
  return user.employeeId != null && log.employeeId === user.employeeId;
}

router.use(authenticate);

router.get("/", (req, res) => {
  const logs = readLogs();

  if (req.user.role === "employee") {
    return res.json(logs.filter((l) => isLogAuthor(l, req.user)));
  }

  if (["superadmin", "admin", "product_manager", "hr"].includes(req.user.role)) {
    return res.json(logs);
  }

  return res.status(403).json({ error: "Access denied" });
});

router.post("/", (req, res) => {
  if (!LOG_CREATORS.has(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { projectId, date, hoursWorked, workDescription, progress } = req.body;

  if (!date || !hoursWorked || !workDescription) {
    return res.status(400).json({ error: "Date, hours, and work description are required" });
  }

  const parsedProjectId = projectId ? Number(projectId) : null;

  if (req.user.role === "employee" && parsedProjectId) {
    if (!isAssignedToProject(req.user.employeeId, parsedProjectId)) {
      return res.status(403).json({ error: "You are not assigned to this project" });
    }

    if (!canLogWork(req.user.employeeId, parsedProjectId)) {
      return res.status(403).json({
        error: "Complete project onboarding before logging work. Go to My Projects to finish required steps.",
        code: "ONBOARDING_REQUIRED",
      });
    }
  }

  const logs = readLogs();
  const existing = logs.find(
    (l) =>
      isLogAuthor(l, req.user) &&
      (l.projectId ?? null) === parsedProjectId &&
      l.date === date
  );

  if (existing) {
    const message = parsedProjectId
      ? "Work log already exists for this project on this date. Please edit it instead."
      : "Work log already exists for this date. Please edit it instead.";
    return res.status(409).json({ error: message });
  }

  let projectName = null;
  if (parsedProjectId) {
    const projects = readData(PROJECTS_FILE);
    const project = projects.find((p) => p.id === parsedProjectId);

    if (!project) {
      return res.status(400).json({ error: "Project not found" });
    }

    projectName = project.name;
  }

  const newLog = {
    id: nextId(logs),
    userId: req.user.id,
    employeeId: req.user.employeeId || null,
    employeeName: req.user.name,
    role: req.user.role,
    projectId: parsedProjectId,
    projectName,
    date,
    hoursWorked: Number(hoursWorked),
    workDescription,
    progress: progress || "In Progress",
    createdAt: new Date().toISOString(),
  };

  logs.push(newLog);
  writeLogs(logs);

  if (req.user.role === "employee" && req.user.employeeId && parsedProjectId) {
    tryAutoCompleteStep(req.user.employeeId, parsedProjectId, "first_work_log");
  }

  res.status(201).json(newLog);
});

router.put("/:id", (req, res) => {
  const logs = readLogs();
  const index = logs.findIndex((l) => l.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Work log not found" });
  }

  const log = logs[index];

  if (LOG_CREATORS.has(req.user.role)) {
    if (!isLogAuthor(log, req.user)) {
      return res.status(403).json({ error: "You can only update your own work logs" });
    }
  } else if (!["superadmin", "admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { hoursWorked, workDescription, progress } = req.body;

  logs[index] = {
    ...log,
    hoursWorked: hoursWorked !== undefined ? Number(hoursWorked) : log.hoursWorked,
    workDescription: workDescription ?? log.workDescription,
    progress: progress ?? log.progress,
    updatedAt: new Date().toISOString(),
  };

  writeLogs(logs);
  res.json(logs[index]);
});

router.delete("/:id", authorize("superadmin", "admin"), (req, res) => {
  const logs = readLogs();
  const index = logs.findIndex((l) => l.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Work log not found" });
  }

  const deleted = logs.splice(index, 1)[0];
  writeLogs(logs);
  res.json(deleted);
});

module.exports = router;
