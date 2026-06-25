const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, dataPath } = require("../utils/jsonStore");
const leaveAllocationStore = require("../utils/leaveAllocationStore");

const router = express.Router();
const LEAVES_FILE = dataPath("leaves.json");

const LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Personal Leave", "Unpaid Leave"];

const TYPE_FIELDS = {
  "Annual Leave": "annualLeave",
  "Sick Leave": "sickLeave",
  "Personal Leave": "personalLeave",
  "Unpaid Leave": "unpaidLeave",
};

const MANAGERS = ["superadmin", "admin", "hr"];

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

function requireMysql(res) {
  if (!leaveAllocationStore.isMysqlEnabled()) {
    res.status(503).json({ error: "Leave allocations require MySQL (set USE_MYSQL=true)" });
    return false;
  }
  return true;
}

router.use(authenticate);

router.get("/", async (req, res) => {
  if (!requireMysql(res)) return;

  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const allocations = await leaveAllocationStore.getAllocationsByYear(year);
    const leaves = readLeaves();

    if (MANAGERS.includes(req.user.role)) {
      return res.json(allocations.map((item) => enrichAllocation(item, leaves)));
    }

    if (req.user.role === "employee" && req.user.employeeId) {
      const own = allocations.find((item) => item.employeeId === req.user.employeeId);
      return res.json(own ? [enrichAllocation(own, leaves)] : []);
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    console.error("GET /leave-allocations failed:", err.code || "", err.message);
    res.status(500).json({ error: "Failed to load leave allocations" });
  }
});

router.post("/", authorize(...MANAGERS), async (req, res) => {
  if (!requireMysql(res)) return;

  try {
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

    const numericYear = Number(year);
    const numericEmployeeId = Number(employeeId);
    const leaves = readLeaves();

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

    const existing = await leaveAllocationStore.findByEmployeeAndYear(numericEmployeeId, numericYear);

    if (existing) {
      const updated = await leaveAllocationStore.updateAllocation(existing.id, {
        ...existing,
        ...payload,
      });
      return res.json(enrichAllocation(updated, leaves));
    }

    const created = await leaveAllocationStore.insertAllocation({
      id: await leaveAllocationStore.getNextId(),
      ...payload,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(enrichAllocation(created, leaves));
  } catch (err) {
    console.error("POST /leave-allocations failed:", err.message);
    res.status(500).json({ error: "Failed to save leave allocation" });
  }
});

router.put("/:id", authorize(...MANAGERS), async (req, res) => {
  if (!requireMysql(res)) return;

  try {
    const id = Number(req.params.id);
    const current = await leaveAllocationStore.getAllocationById(id);

    if (!current) {
      return res.status(404).json({ error: "Leave allocation not found" });
    }

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

    const updated = await leaveAllocationStore.updateAllocation(id, {
      ...current,
      employeeId: employeeId !== undefined ? Number(employeeId) : current.employeeId,
      employeeName: employeeName ?? current.employeeName,
      year: year !== undefined ? Number(year) : current.year,
      annualLeave: annualLeave !== undefined ? Number(annualLeave) || 0 : current.annualLeave,
      sickLeave: sickLeave !== undefined ? Number(sickLeave) || 0 : current.sickLeave,
      personalLeave: personalLeave !== undefined ? Number(personalLeave) || 0 : current.personalLeave,
      unpaidLeave: unpaidLeave !== undefined ? Number(unpaidLeave) || 0 : current.unpaidLeave,
      notes: notes ?? current.notes,
    });

    res.json(enrichAllocation(updated, readLeaves()));
  } catch (err) {
    console.error("PUT /leave-allocations failed:", err.message);
    res.status(500).json({ error: "Failed to update leave allocation" });
  }
});

router.delete("/:id", authorize(...MANAGERS), async (req, res) => {
  if (!requireMysql(res)) return;

  try {
    const deleted = await leaveAllocationStore.deleteAllocation(Number(req.params.id));

    if (!deleted) {
      return res.status(404).json({ error: "Leave allocation not found" });
    }

    res.json(deleted);
  } catch (err) {
    console.error("DELETE /leave-allocations failed:", err.message);
    res.status(500).json({ error: "Failed to delete leave allocation" });
  }
});

module.exports = router;
