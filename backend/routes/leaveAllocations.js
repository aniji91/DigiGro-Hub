const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");

const router = express.Router();
const FILE = dataPath("leave_allocations.json");
const LEAVES_FILE = dataPath("leaves.json");

const LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Personal Leave", "Unpaid Leave"];

const TYPE_FIELDS = {
  "Annual Leave": "annualLeave",
  "Sick Leave": "sickLeave",
  "Personal Leave": "personalLeave",
  "Unpaid Leave": "unpaidLeave",
};

const MANAGERS = ["superadmin", "admin", "hr"];

function readAllocations() {
  return readData(FILE);
}

function writeAllocations(items) {
  writeData(FILE, items);
}

function readLeaves() {
  return readData(LEAVES_FILE);
}

function daysInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 0);
}

function usedDaysByType(leaves, employeeId, year) {
  const used = Object.fromEntries(LEAVE_TYPES.map((type) => [type, 0]));

  leaves.forEach((leave) => {
    if (leave.employeeId !== employeeId || leave.status !== "Approved") return;
    if (!leave.startDate?.startsWith(String(year))) return;
    if (!LEAVE_TYPES.includes(leave.type)) return;
    used[leave.type] += daysInclusive(leave.startDate, leave.endDate);
  });

  return used;
}

function enrichAllocation(allocation, leaves) {
  const used = usedDaysByType(leaves, allocation.employeeId, allocation.year);
  const remaining = {};

  LEAVE_TYPES.forEach((type) => {
    const field = TYPE_FIELDS[type];
    const allocated = Number(allocation[field] || 0);
    remaining[type] = Math.max(allocated - used[type], 0);
  });

  return { ...allocation, used, remaining };
}

router.use(authenticate);

router.get("/", (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const allocations = readAllocations().filter((item) => item.year === year);
  const leaves = readLeaves();

  if (MANAGERS.includes(req.user.role)) {
    return res.json(allocations.map((item) => enrichAllocation(item, leaves)));
  }

  if (req.user.role === "employee" && req.user.employeeId) {
    const own = allocations.find((item) => item.employeeId === req.user.employeeId);
    return res.json(own ? [enrichAllocation(own, leaves)] : []);
  }

  return res.status(403).json({ error: "Access denied" });
});

router.post("/", authorize(...MANAGERS), (req, res) => {
  const {
    employeeId,
    employeeName,
    year = new Date().getFullYear(),
    annualLeave = 0,
    sickLeave = 0,
    personalLeave = 0,
    unpaidLeave = 0,
    notes = "",
  } = req.body;

  if (!employeeId || !employeeName) {
    return res.status(400).json({ error: "Employee is required" });
  }

  const allocations = readAllocations();
  const numericYear = Number(year);
  const numericEmployeeId = Number(employeeId);
  const existingIndex = allocations.findIndex(
    (item) => item.employeeId === numericEmployeeId && item.year === numericYear
  );

  const payload = {
    employeeId: numericEmployeeId,
    employeeName,
    year: numericYear,
    annualLeave: Number(annualLeave) || 0,
    sickLeave: Number(sickLeave) || 0,
    personalLeave: Number(personalLeave) || 0,
    unpaidLeave: Number(unpaidLeave) || 0,
    notes: notes || "",
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    allocations[existingIndex] = {
      ...allocations[existingIndex],
      ...payload,
    };
    writeAllocations(allocations);
    return res.json(enrichAllocation(allocations[existingIndex], readLeaves()));
  }

  const created = {
    id: nextId(allocations),
    ...payload,
    createdAt: new Date().toISOString(),
  };

  allocations.push(created);
  writeAllocations(allocations);
  res.status(201).json(enrichAllocation(created, readLeaves()));
});

router.put("/:id", authorize(...MANAGERS), (req, res) => {
  const allocations = readAllocations();
  const index = allocations.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Leave allocation not found" });
  }

  const current = allocations[index];
  const {
    employeeId,
    employeeName,
    year,
    annualLeave,
    sickLeave,
    personalLeave,
    unpaidLeave,
    notes,
  } = req.body;

  allocations[index] = {
    ...current,
    employeeId: employeeId !== undefined ? Number(employeeId) : current.employeeId,
    employeeName: employeeName ?? current.employeeName,
    year: year !== undefined ? Number(year) : current.year,
    annualLeave: annualLeave !== undefined ? Number(annualLeave) || 0 : current.annualLeave,
    sickLeave: sickLeave !== undefined ? Number(sickLeave) || 0 : current.sickLeave,
    personalLeave: personalLeave !== undefined ? Number(personalLeave) || 0 : current.personalLeave,
    unpaidLeave: unpaidLeave !== undefined ? Number(unpaidLeave) || 0 : current.unpaidLeave,
    notes: notes ?? current.notes,
    updatedAt: new Date().toISOString(),
  };

  writeAllocations(allocations);
  res.json(enrichAllocation(allocations[index], readLeaves()));
});

router.delete("/:id", authorize(...MANAGERS), (req, res) => {
  const allocations = readAllocations();
  const index = allocations.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Leave allocation not found" });
  }

  const deleted = allocations.splice(index, 1)[0];
  writeAllocations(allocations);
  res.json(deleted);
});

module.exports = router;
