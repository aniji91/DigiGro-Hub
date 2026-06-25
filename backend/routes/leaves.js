const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");

const router = express.Router();
const FILE = dataPath("leaves.json");

function readLeaves() {
  return readData(FILE);
}

function writeLeaves(leaves) {
  writeData(FILE, leaves);
}

router.use(authenticate);

router.get("/", (req, res) => {
  const leaves = readLeaves();

  if (req.user.role === "employee") {
    return res.json(leaves.filter((l) => l.employeeId === req.user.employeeId));
  }

  if (["superadmin", "hr"].includes(req.user.role)) {
    return res.json(leaves);
  }

  return res.status(403).json({ error: "Access denied" });
});

router.post("/", (req, res) => {
  const { type, startDate, endDate, reason } = req.body;

  if (!type || !startDate || !endDate) {
    return res.status(400).json({ error: "Leave type, start date, and end date are required" });
  }

  if (req.user.role === "employee") {
    if (!req.user.employeeId) {
      return res.status(400).json({ error: "Employee account is not linked to an employee record" });
    }

    const leaves = readLeaves();
    const newLeave = {
      id: nextId(leaves),
      employeeId: req.user.employeeId,
      employeeName: req.user.name,
      type,
      startDate,
      endDate,
      status: "Pending",
      reason: reason || "",
      createdAt: new Date().toISOString(),
    };

    leaves.push(newLeave);
    writeLeaves(leaves);
    return res.status(201).json(newLeave);
  }

  if (!["superadmin", "hr"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { employeeId, employeeName, status } = req.body;
  if (!employeeId || !employeeName) {
    return res.status(400).json({ error: "Employee is required" });
  }

  const leaves = readLeaves();
  const newLeave = {
    id: nextId(leaves),
    employeeId: Number(employeeId),
    employeeName,
    type,
    startDate,
    endDate,
    status: status || "Pending",
    reason: reason || "",
    createdAt: new Date().toISOString(),
  };

  leaves.push(newLeave);
  writeLeaves(leaves);
  res.status(201).json(newLeave);
});

router.put("/:id", (req, res) => {
  const leaves = readLeaves();
  const index = leaves.findIndex((l) => l.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Leave request not found" });
  }

  const leave = leaves[index];

  if (req.user.role === "employee") {
    if (leave.employeeId !== req.user.employeeId) {
      return res.status(403).json({ error: "You can only update your own leave requests" });
    }
    if (leave.status !== "Pending") {
      return res.status(400).json({ error: "Only pending leave requests can be updated" });
    }

    const { type, startDate, endDate, reason } = req.body;
    leaves[index] = {
      ...leave,
      type: type ?? leave.type,
      startDate: startDate ?? leave.startDate,
      endDate: endDate ?? leave.endDate,
      reason: reason ?? leave.reason,
      updatedAt: new Date().toISOString(),
    };

    writeLeaves(leaves);
    return res.json(leaves[index]);
  }

  if (!["superadmin", "hr"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { employeeId, employeeName, type, startDate, endDate, status, reason } = req.body;
  leaves[index] = {
    ...leave,
    employeeId: employeeId !== undefined ? Number(employeeId) : leave.employeeId,
    employeeName: employeeName ?? leave.employeeName,
    type: type ?? leave.type,
    startDate: startDate ?? leave.startDate,
    endDate: endDate ?? leave.endDate,
    status: status ?? leave.status,
    reason: reason ?? leave.reason,
    updatedAt: new Date().toISOString(),
  };

  writeLeaves(leaves);
  res.json(leaves[index]);
});

router.delete("/:id", authorize("superadmin", "hr"), (req, res) => {
  const leaves = readLeaves();
  const index = leaves.findIndex((l) => l.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Leave request not found" });
  }

  const deleted = leaves.splice(index, 1)[0];
  writeLeaves(leaves);
  res.json(deleted);
});

module.exports = router;
