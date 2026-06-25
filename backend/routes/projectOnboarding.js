const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, dataPath } = require("../utils/jsonStore");
const {
  readOnboarding,
  syncOnboardingForProject,
  completeStep,
  enrichWithProgress,
} = require("../utils/projectOnboarding");

const router = express.Router();

function isAssigned(employeeId, projectId) {
  const projects = readData(dataPath("projects.json"));
  const project = projects.find((p) => p.id === Number(projectId));
  return project && (project.assignedEmployeeIds || []).includes(employeeId);
}

router.use(authenticate);

router.get("/", (req, res) => {
  if (req.user.role !== "employee" || !req.user.employeeId) {
    return res.status(403).json({ error: "Employee access only" });
  }

  const projects = readData(dataPath("projects.json")).filter((p) =>
    (p.assignedEmployeeIds || []).includes(req.user.employeeId)
  );
  projects.forEach((project) => syncOnboardingForProject(project));

  const records = readOnboarding()
    .filter((r) => r.employeeId === req.user.employeeId)
    .map(enrichWithProgress);

  res.json(records);
});

router.get("/project/:projectId", (req, res) => {
  const projectId = Number(req.params.projectId);

  if (req.user.role === "employee") {
    if (!req.user.employeeId || !isAssigned(req.user.employeeId, projectId)) {
      return res.status(403).json({ error: "You are not assigned to this project" });
    }

    const projects = readData(dataPath("projects.json"));
    const project = projects.find((p) => p.id === projectId);
    if (project) syncOnboardingForProject(project);

    const record = readOnboarding()
      .filter((r) => r.employeeId === req.user.employeeId && r.projectId === projectId)
      .map(enrichWithProgress)[0];

    if (!record) return res.status(404).json({ error: "Onboarding not found" });
    return res.json(record);
  }

  if (!["superadmin", "admin", "product_manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const projects = readData(dataPath("projects.json"));
  const project = projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  syncOnboardingForProject(project);
  const employees = readData(dataPath("employees.json"));
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const team = readOnboarding()
    .filter((r) => r.projectId === projectId)
    .map((r) => ({
      ...enrichWithProgress(r),
      employeeName: employeeMap[r.employeeId] || `Employee #${r.employeeId}`,
    }));

  res.json({ projectId, projectName: project.name, team });
});

router.patch("/:id/steps/:stepId", (req, res) => {
  if (req.user.role !== "employee" || !req.user.employeeId) {
    return res.status(403).json({ error: "Employee access only" });
  }

  const updated = completeStep(req.params.id, req.params.stepId, req.user.employeeId);
  if (!updated) return res.status(404).json({ error: "Onboarding step not found" });

  res.json(enrichWithProgress(updated));
});

module.exports = router;
