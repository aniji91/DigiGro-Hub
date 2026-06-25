const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");

const router = express.Router();
const FILE = dataPath("holidays.json");

function readHolidays() {
  return readData(FILE);
}

function writeHolidays(holidays) {
  writeData(FILE, holidays);
}

function filterByYear(holidays, year) {
  if (!year) return holidays;
  return holidays.filter((h) => h.date.startsWith(String(year)));
}

router.use(authenticate);

router.get("/", (req, res) => {
  if (!["superadmin", "hr", "employee"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const year = req.query.year || new Date().getFullYear();
  const holidays = filterByYear(readHolidays(), year).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  res.json(holidays);
});

router.post("/", authorize("superadmin", "hr"), (req, res) => {
  const { name, date, type, description } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: "Holiday name and date are required" });
  }

  const holidays = readHolidays();
  const newHoliday = {
    id: nextId(holidays),
    name,
    date,
    type: type || "Public Holiday",
    description: description || "",
    createdAt: new Date().toISOString(),
  };

  holidays.push(newHoliday);
  writeHolidays(holidays);
  res.status(201).json(newHoliday);
});

router.put("/:id", authorize("superadmin", "hr"), (req, res) => {
  const holidays = readHolidays();
  const index = holidays.findIndex((h) => h.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Holiday not found" });
  }

  const { name, date, type, description } = req.body;
  holidays[index] = {
    ...holidays[index],
    name: name ?? holidays[index].name,
    date: date ?? holidays[index].date,
    type: type ?? holidays[index].type,
    description: description ?? holidays[index].description,
    updatedAt: new Date().toISOString(),
  };

  writeHolidays(holidays);
  res.json(holidays[index]);
});

router.delete("/:id", authorize("superadmin", "hr"), (req, res) => {
  const holidays = readHolidays();
  const index = holidays.findIndex((h) => h.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Holiday not found" });
  }

  const deleted = holidays.splice(index, 1)[0];
  writeHolidays(holidays);
  res.json(deleted);
});

module.exports = router;
