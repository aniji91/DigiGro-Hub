const { readData, writeData, dataPath, nextId } = require("./jsonStore");

const FILE = dataPath("project_onboarding.json");

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Review project brief",
    description: "Read the project description, timeline, and objectives",
    action: "review_brief",
  },
  {
    id: 2,
    title: "Acknowledge project guidelines",
    description: "Confirm you understand team expectations and delivery standards",
    action: "acknowledge",
  },
  {
    id: 3,
    title: "Join project team chat",
    description: "Introduce yourself in the project channel or direct chat",
    action: "join_chat",
  },
  {
    id: 4,
    title: "Log your first work update",
    description: "Submit your first daily work log for this project",
    action: "first_work_log",
  },
];

function readOnboarding() {
  return readData(FILE);
}

function writeOnboarding(records) {
  writeData(FILE, records);
}

function buildSteps() {
  return ONBOARDING_STEPS.map((step) => ({
    stepId: step.id,
    title: step.title,
    description: step.description,
    action: step.action,
    completedAt: null,
  }));
}

function syncOnboardingForProject(project) {
  const employeeIds = project.assignedEmployeeIds || [];
  const records = readOnboarding();
  const projectId = Number(project.id);

  const kept = records.filter(
    (r) => r.projectId !== projectId || employeeIds.includes(r.employeeId)
  );

  for (const employeeId of employeeIds) {
    if (!kept.some((r) => r.projectId === projectId && r.employeeId === employeeId)) {
      kept.push({
        id: nextId(kept),
        projectId,
        projectName: project.name,
        employeeId,
        status: "pending",
        steps: buildSteps(),
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    } else {
      kept.forEach((r) => {
        if (r.projectId === projectId && r.employeeId === employeeId) {
          r.projectName = project.name;
        }
      });
    }
  }

  writeOnboarding(kept);
  return kept.filter((r) => r.projectId === projectId);
}

function syncAllProjectsOnboarding() {
  const projects = readData(dataPath("projects.json"));
  projects.forEach((project) => syncOnboardingForProject(project));
}

function getRecord(employeeId, projectId) {
  return readOnboarding().find(
    (r) => r.employeeId === employeeId && r.projectId === Number(projectId)
  );
}

function isOnboardingComplete(employeeId, projectId) {
  const record = getRecord(employeeId, projectId);
  if (!record) return true;
  return record.status === "completed";
}

function canLogWork(employeeId, projectId) {
  const record = getRecord(employeeId, projectId);
  if (!record || record.status === "completed") return true;
  const requiredBeforeWork = record.steps.filter((s) => s.action !== "first_work_log");
  return requiredBeforeWork.every((s) => s.completedAt);
}

function completeStep(recordId, stepId, employeeId) {
  const records = readOnboarding();
  const index = records.findIndex((r) => r.id === Number(recordId));
  if (index === -1) return null;

  const record = records[index];
  if (record.employeeId !== employeeId) return null;

  const step = record.steps.find((s) => s.stepId === Number(stepId));
  if (!step || step.completedAt) return record;

  step.completedAt = new Date().toISOString();

  const allDone = record.steps.every((s) => s.completedAt);
  if (allDone) {
    record.status = "completed";
    record.completedAt = new Date().toISOString();
  } else {
    record.status = "in_progress";
  }

  records[index] = record;
  writeOnboarding(records);
  return record;
}

function tryAutoCompleteStep(employeeId, projectId, action) {
  const record = getRecord(employeeId, projectId);
  if (!record || record.status === "completed") return record;

  const step = record.steps.find((s) => s.action === action && !s.completedAt);
  if (!step) return record;

  return completeStep(record.id, step.stepId, employeeId);
}

function enrichWithProgress(record) {
  const total = record.steps.length;
  const done = record.steps.filter((s) => s.completedAt).length;
  return {
    ...record,
    progressPercent: total ? Math.round((done / total) * 100) : 0,
    completedSteps: done,
    totalSteps: total,
  };
}

module.exports = {
  ONBOARDING_STEPS,
  readOnboarding,
  syncOnboardingForProject,
  syncAllProjectsOnboarding,
  getRecord,
  isOnboardingComplete,
  canLogWork,
  completeStep,
  tryAutoCompleteStep,
  enrichWithProgress,
};
