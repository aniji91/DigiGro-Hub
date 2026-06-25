const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readData, dataPath } = require("../utils/jsonStore");
const { getCelebrations } = require("../utils/celebrations");

const router = express.Router();

function withCelebrations(payload, employees) {
  const today = new Date().toISOString().slice(0, 10);
  const announcements = readData(dataPath("announcements.json"))
    .filter((item) => {
      if (item.isActive === false) return false;
      if (item.publishDate && item.publishDate > today) return false;
      if (item.expiresAt && item.expiresAt < today) return false;
      return true;
    })
    .sort((a, b) => (b.publishDate || b.createdAt).localeCompare(a.publishDate || a.createdAt))
    .slice(0, 3);

  return {
    ...payload,
    celebrations: getCelebrations(employees, { daysAhead: 7 }),
    announcements,
  };
}

router.get("/stats", authenticate, (req, res) => {
  const employees = readData(dataPath("employees.json"));
  const clients = readData(dataPath("clients.json"));
  const projects = readData(dataPath("projects.json"));
  const leaves = readData(dataPath("leaves.json"));
  const users = readData(dataPath("users.json"));

  const activeProjects = projects.filter((p) => p.status === "In Progress");
  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  if (req.user.role === "hr") {
    const workLogs = readData(dataPath("work_logs.json"));
    const today = new Date().toISOString().slice(0, 10);
    return res.json(withCelebrations({
      role: "hr",
      stats: {
        employees: employees.length,
        pendingLeaves: pendingLeaves.length,
        approvedLeaves: leaves.filter((l) => l.status === "Approved").length,
        departments: [...new Set(employees.map((e) => e.department))].length,
        totalWorkLogs: workLogs.length,
        todayLogs: workLogs.filter((l) => l.date === today).length,
      },
      recentLeaves: leaves.slice(-5).reverse(),
      recentEmployees: employees.slice(-5).reverse(),
      recentWorkLogs: workLogs.slice(-5).reverse(),
    }, employees));
  }

  if (req.user.role === "admin") {
    return res.json(withCelebrations({
      role: "admin",
      stats: {
        employees: employees.length,
        projects: projects.length,
        activeProjects: activeProjects.length,
        departments: [...new Set(employees.map((e) => e.department))].length,
      },
      recentProjects: projects.slice(-5).reverse(),
      recentEmployees: employees.slice(-5).reverse(),
    }, employees));
  }

  if (req.user.role === "product_manager") {
    const workLogs = readData(dataPath("work_logs.json"));
    const today = new Date().toISOString().slice(0, 10);
    const myProjects = projects.filter((p) =>
      (p.assignedEmployeeIds || []).length > 0
    );
    return res.json(withCelebrations({
      role: "product_manager",
      stats: {
        projects: projects.length,
        activeProjects: activeProjects.length,
        assignedProjects: myProjects.length,
        teamMembers: new Set(projects.flatMap((p) => p.assignedEmployeeIds || [])).size,
        totalWorkLogs: workLogs.length,
        todayLogs: workLogs.filter((l) => l.date === today).length,
      },
      recentProjects: projects.slice(-5).reverse(),
      recentWorkLogs: workLogs.slice(-5).reverse(),
    }, employees));
  }

  if (req.user.role === "employee") {
    const workLogs = readData(dataPath("work_logs.json"));
    const onboarding = readData(dataPath("project_onboarding.json"));
    const myProjects = projects.filter((p) =>
      (p.assignedEmployeeIds || []).includes(req.user.employeeId)
    );
    const myLogs = workLogs.filter((l) => l.employeeId === req.user.employeeId);
    const myLeaves = leaves.filter((l) => l.employeeId === req.user.employeeId);
    const myOnboarding = onboarding.filter((r) => r.employeeId === req.user.employeeId);
    const pendingOnboarding = myOnboarding.filter((r) => r.status !== "completed");
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = myLogs.filter((l) => l.date === today);

    return res.json(withCelebrations({
      role: "employee",
      stats: {
        assignedProjects: myProjects.length,
        activeProjects: myProjects.filter((p) => p.status === "In Progress").length,
        totalWorkLogs: myLogs.length,
        todayLogs: todayLogs.length,
        pendingLeaves: myLeaves.filter((l) => l.status === "Pending").length,
        approvedLeaves: myLeaves.filter((l) => l.status === "Approved").length,
        pendingOnboarding: pendingOnboarding.length,
      },
      myProjects: myProjects.slice(0, 5),
      pendingOnboarding: pendingOnboarding.slice(0, 5).map((r) => ({
        id: r.id,
        projectId: r.projectId,
        projectName: r.projectName,
        status: r.status,
        completedSteps: r.steps.filter((s) => s.completedAt).length,
        totalSteps: r.steps.length,
      })),
      recentWorkLogs: myLogs.slice(-5).reverse(),
      recentLeaves: myLeaves.slice(-5).reverse(),
    }, employees));
  }

  res.json(withCelebrations({
    role: "superadmin",
    stats: {
      employees: employees.length,
      clients: clients.length,
      projects: projects.length,
      activeProjects: activeProjects.length,
      pendingLeaves: pendingLeaves.length,
      users: users.length,
    },
    recentProjects: projects.slice(-5).reverse(),
    recentLeaves: leaves.slice(-5).reverse(),
    recentEmployees: employees.slice(-5).reverse(),
  }, employees));
});

module.exports = router;
