const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readData, dataPath } = require("../utils/jsonStore");
const { syncOnboardingForProject, enrichWithProgress } = require("../utils/projectOnboarding");

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  if (req.user.role !== "employee" || !req.user.employeeId) {
    return res.status(403).json({ error: "Employee access only" });
  }

  const projects = readData(dataPath("projects.json"));
  const assigned = projects.filter((p) =>
    (p.assignedEmployeeIds || []).includes(req.user.employeeId)
  );

  assigned.forEach((project) => syncOnboardingForProject(project));

  const onboarding = readData(dataPath("project_onboarding.json")).filter(
    (r) => r.employeeId === req.user.employeeId
  );

  const enriched = assigned.map((project) => {
    const record = onboarding.find((r) => r.projectId === project.id);
    return {
      ...project,
      onboarding: record ? enrichWithProgress(record) : null,
      onboardingRequired: record ? record.status !== "completed" : false,
    };
  });

  res.json(enriched);
});

module.exports = router;
