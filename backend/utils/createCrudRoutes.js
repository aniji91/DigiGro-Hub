const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath, nextId } = require("./jsonStore");

function createCrudRoutes(filename, options = {}) {
  const router = express.Router();
  const filePath = dataPath(filename);
  const {
    createRoles = ["superadmin", "admin"],
    updateRoles = ["superadmin", "admin"],
    deleteRoles = ["superadmin", "admin"],
    requiredFields = [],
    defaults = () => ({}),
    afterCreate = null,
    afterUpdate = null,
  } = options;

  router.use(authenticate);

  router.get("/", (req, res) => {
    res.json(readData(filePath));
  });

  router.get("/:id", (req, res) => {
    const items = readData(filePath);
    const item = items.find((entry) => entry.id === Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  router.post("/", authorize(...createRoles), (req, res) => {
    const missing = requiredFields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    }

    const items = readData(filePath);
    const newItem = {
      id: nextId(items),
      ...defaults(req.body),
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    items.push(newItem);
    writeData(filePath, items);
    if (afterCreate) afterCreate(newItem);
    res.status(201).json(newItem);
  });

  router.put("/:id", authorize(...updateRoles), (req, res) => {
    const items = readData(filePath);
    const index = items.findIndex((entry) => entry.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: "Not found" });

    const previous = { ...items[index] };
    items[index] = { ...items[index], ...req.body, id: items[index].id };
    writeData(filePath, items);
    if (afterUpdate) afterUpdate(items[index], previous);
    res.json(items[index]);
  });

  router.delete("/:id", authorize(...deleteRoles), (req, res) => {
    const items = readData(filePath);
    const index = items.findIndex((entry) => entry.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: "Not found" });

    const deleted = items.splice(index, 1)[0];
    writeData(filePath, items);
    res.json(deleted);
  });

  return router;
}

module.exports = createCrudRoutes;
