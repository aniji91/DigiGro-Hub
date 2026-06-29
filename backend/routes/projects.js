const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");
const { normalizeProject, normalizeEnvironmentDetails, normalizeExternalCrmIntegrations } = require("../utils/projectFields");
const { syncOnboardingForProject } = require("../utils/projectOnboarding");

const router = express.Router();
const FILE = dataPath("projects.json");
const CREATE_ROLES = ["superadmin", "admin", "product_manager"];
const UPDATE_ROLES = ["superadmin", "admin", "product_manager"];
const DELETE_ROLES = ["superadmin", "admin", "product_manager"];

function canUpdateEnvironment(user, project) {
  if (UPDATE_ROLES.includes(user.role)) return true;
  if (!user.employeeId) return false;
  return (project.assignedEmployeeIds || []).includes(user.employeeId);
}

function readProjects() {
  return readData(FILE);
}

function writeProjects(projects) {
  writeData(FILE, projects);
}

router.use(authenticate);

router.get("/", (req, res) => {
  res.json(readProjects());
});

router.get("/:id", (req, res) => {
  const project = readProjects().find((p) => p.id === Number(req.params.id));
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

router.post("/", authorize(...CREATE_ROLES), (req, res) => {
  const { name, clientName, status, startDate } = req.body;
  if (!name || !clientName || !status || !startDate) {
    return res.status(400).json({ error: "Name, client, status, and start date are required" });
  }

  const projects = readProjects();
  const newProject = {
    id: nextId(projects),
    ...normalizeProject(req.body),
    createdAt: new Date().toISOString(),
  };

  projects.push(newProject);
  writeProjects(projects);
  syncOnboardingForProject(newProject);
  res.status(201).json(newProject);
});

router.put("/:id", authorize(...UPDATE_ROLES), (req, res) => {
  const projects = readProjects();
  const index = projects.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Not found" });

  projects[index] = {
    ...projects[index],
    ...normalizeProject(req.body, projects[index]),
    id: projects[index].id,
  };

  writeProjects(projects);
  syncOnboardingForProject(projects[index]);
  res.json(projects[index]);
});

router.patch("/:id/environment", (req, res) => {
  const projects = readProjects();
  const index = projects.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Not found" });

  const project = projects[index];
  if (!canUpdateEnvironment(req.user, project)) {
    return res.status(403).json({ error: "Not allowed to update environment details" });
  }

  projects[index] = {
    ...project,
    stagingDetails: normalizeEnvironmentDetails(req.body.stagingDetails, project.stagingDetails),
    productionDetails: normalizeEnvironmentDetails(req.body.productionDetails, project.productionDetails),
  };

  writeProjects(projects);
  res.json(projects[index]);
});

router.patch("/:id/external-crms", (req, res) => {
  const projects = readProjects();
  const index = projects.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Not found" });

  const project = projects[index];
  if (!canUpdateEnvironment(req.user, project)) {
    return res.status(403).json({ error: "Not allowed to update external CRM details" });
  }

  projects[index] = {
    ...project,
    externalCrmIntegrations: normalizeExternalCrmIntegrations(req.body.externalCrmIntegrations),
  };

  writeProjects(projects);
  res.json(projects[index]);
});

router.delete("/:id", authorize(...DELETE_ROLES), (req, res) => {
  const projects = readProjects();
  const index = projects.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Not found" });

  const deleted = projects.splice(index, 1)[0];
  writeProjects(projects);
  res.json(deleted);
});

module.exports = router;
