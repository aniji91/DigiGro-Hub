const express = require("express");
const { authenticate } = require("../middleware/auth");
const { loadDailyWork } = require("../utils/dailyWorkSql");

const router = express.Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const { projectId, date, employeeId } = req.query;

  if (req.user.role === "employee" && !req.user.employeeId) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (!["superadmin", "admin", "product_manager", "hr", "employee"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const data = await loadDailyWork(req.user, {
      projectId: projectId || "",
      date: date || "",
      employeeId: employeeId || "",
    });
    res.json(data);
  } catch (err) {
    console.error("Failed to load daily work feed:", err.message);
    res.status(500).json({ error: "Failed to load daily work data" });
  }
});

module.exports = router;
