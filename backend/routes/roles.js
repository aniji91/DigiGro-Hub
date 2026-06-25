const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, dataPath } = require("../utils/jsonStore");
const {
  readRoles,
  writeRoles,
  getRoleByKey,
  getRoleLabels,
  getModulePermissions,
  slugifyKey,
  MODULE_KEYS,
  ACCESS_LEVELS,
} = require("../utils/roles");

const router = express.Router();
const USERS_FILE = dataPath("users.json");

function countUsersWithRole(roleKey) {
  return readData(USERS_FILE).filter((u) => u.role === roleKey).length;
}

router.use(authenticate);

router.get("/meta/modules", authorize("superadmin", "admin"), (req, res) => {
  res.json({ modules: MODULE_KEYS, accessLevels: ACCESS_LEVELS });
});

router.get("/labels", (req, res) => {
  res.json(getRoleLabels());
});

router.get("/my-permissions", (req, res) => {
  res.json({
    role: req.user.role,
    modulePermissions: getModulePermissions(req.user.role),
  });
});

router.get("/key/:key", (req, res) => {
  const role = getRoleByKey(req.params.key);
  if (!role) return res.status(404).json({ error: "Role not found" });
  res.json(role);
});

router.get("/", authorize("superadmin", "admin"), (req, res) => {
  res.json(readRoles());
});

router.get("/:id", authorize("superadmin", "admin"), (req, res) => {
  const role = readRoles().find((r) => r.id === Number(req.params.id));
  if (!role) return res.status(404).json({ error: "Role not found" });
  res.json(role);
});

router.post("/", authorize("superadmin"), (req, res) => {
  const { label, key, description, color, assignableBy, modulePermissions } = req.body;

  if (!label?.trim()) {
    return res.status(400).json({ error: "Role label is required" });
  }

  const roles = readRoles();
  const roleKey = (key || slugifyKey(label)).trim().toLowerCase();

  if (!roleKey) {
    return res.status(400).json({ error: "Role key is required" });
  }

  if (roles.some((r) => r.key === roleKey)) {
    return res.status(409).json({ error: "Role key already exists" });
  }

  const newRole = {
    id: roles.length > 0 ? Math.max(...roles.map((r) => r.id)) + 1 : 1,
    key: roleKey,
    label: label.trim(),
    description: description?.trim() || "",
    color: color || "#6366f1",
    isSystem: false,
    assignableBy: Array.isArray(assignableBy) ? assignableBy : [],
    modulePermissions: modulePermissions || {},
    createdAt: new Date().toISOString(),
  };

  roles.push(newRole);
  writeRoles(roles);
  res.status(201).json(newRole);
});

router.put("/:id", authorize("superadmin"), (req, res) => {
  const roles = readRoles();
  const index = roles.findIndex((r) => r.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Role not found" });

  const current = roles[index];
  const { label, description, color, assignableBy, modulePermissions } = req.body;

  if (current.isSystem && current.key === "superadmin" && modulePermissions) {
    const next = { ...current.modulePermissions, ...modulePermissions };
    if (!next.roles || next.roles !== "crud") {
      return res.status(400).json({ error: "Super Admin must retain full roles access" });
    }
  }

  roles[index] = {
    ...current,
    label: label?.trim() || current.label,
    description: description !== undefined ? description.trim() : current.description,
    color: color || current.color,
    assignableBy: Array.isArray(assignableBy) ? assignableBy : current.assignableBy,
    modulePermissions:
      modulePermissions !== undefined ? modulePermissions : current.modulePermissions,
  };

  writeRoles(roles);
  res.json(roles[index]);
});

router.delete("/:id", authorize("superadmin"), (req, res) => {
  const roles = readRoles();
  const index = roles.findIndex((r) => r.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Role not found" });

  const role = roles[index];

  if (role.isSystem) {
    return res.status(400).json({ error: "System roles cannot be deleted" });
  }

  const userCount = countUsersWithRole(role.key);
  if (userCount > 0) {
    return res.status(400).json({
      error: `Cannot delete role — ${userCount} user(s) still assigned to it`,
    });
  }

  const deleted = roles.splice(index, 1)[0];
  writeRoles(roles);
  res.json(deleted);
});

module.exports = router;
