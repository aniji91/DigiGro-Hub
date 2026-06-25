const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");
const { getCelebrations } = require("../utils/celebrations");

const router = express.Router();
const FILE = dataPath("announcements.json");

function readAnnouncements() {
  return readData(FILE);
}

function writeAnnouncements(items) {
  writeData(FILE, items);
}

function isActiveAnnouncement(item, today) {
  if (item.isActive === false) return false;
  if (item.publishDate && item.publishDate > today) return false;
  if (item.expiresAt && item.expiresAt < today) return false;
  return true;
}

router.use(authenticate);

router.get("/", (req, res) => {
  const employees = readData(dataPath("employees.json"));
  const today = new Date().toISOString().slice(0, 10);
  const celebrations = getCelebrations(employees, { daysAhead: 30 });
  const announcements = readAnnouncements()
    .filter((item) => isActiveAnnouncement(item, today))
    .sort((a, b) => (b.publishDate || b.createdAt).localeCompare(a.publishDate || a.createdAt));

  res.json({ celebrations, announcements });
});

router.post("/", authorize("superadmin", "hr"), (req, res) => {
  const { title, body, publishDate, expiresAt } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const items = readAnnouncements();
  const created = {
    id: nextId(items),
    title,
    body,
    type: "general",
    publishDate: publishDate || today,
    expiresAt: expiresAt || null,
    isActive: true,
    authorId: req.user.id,
    authorName: req.user.name,
    createdAt: new Date().toISOString(),
  };

  items.push(created);
  writeAnnouncements(items);
  res.status(201).json(created);
});

router.put("/:id", authorize("superadmin", "hr"), (req, res) => {
  const items = readAnnouncements();
  const index = items.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  const existing = items[index];
  const { title, body, publishDate, expiresAt, isActive } = req.body;

  items[index] = {
    ...existing,
    title: title ?? existing.title,
    body: body ?? existing.body,
    publishDate: publishDate ?? existing.publishDate,
    expiresAt: expiresAt !== undefined ? expiresAt || null : existing.expiresAt,
    isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    updatedAt: new Date().toISOString(),
  };

  writeAnnouncements(items);
  res.json(items[index]);
});

router.delete("/:id", authorize("superadmin", "hr"), (req, res) => {
  const items = readAnnouncements();
  const index = items.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  const deleted = items.splice(index, 1)[0];
  writeAnnouncements(items);
  res.json(deleted);
});

module.exports = router;
