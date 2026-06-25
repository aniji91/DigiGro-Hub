const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath } = require("../utils/jsonStore");
const { canAssignRole, getAssignableRoles, getRoleLabels, getValidRoleKeys } = require("../utils/roles");

const router = express.Router();
const USERS_FILE = dataPath("users.json");

function readUsers() {
  return readData(USERS_FILE);
}

function writeUsers(users) {
  writeData(USERS_FILE, users);
}

router.use(authenticate);

router.get("/meta/assignable-roles", authorize("superadmin", "admin", "hr"), (req, res) => {
  const labels = getRoleLabels();
  const roles = getAssignableRoles(req.user.role);
  res.json({
    roles: roles.map((role) => ({ value: role, label: labels[role] || role })),
  });
});

router.get("/", authorize("superadmin", "admin", "hr"), (req, res) => {
  const users = readUsers().map(({ passwordHash, ...user }) => user);
  res.json(users);
});

router.post("/", authorize("superadmin", "admin", "hr"), async (req, res) => {
  const { username, password, role, name, employeeId } = req.body;

  if (!username || !password || !role || !name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!getValidRoleKeys().includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (!canAssignRole(req.user.role, role)) {
    return res.status(403).json({ error: "You cannot assign this role" });
  }

  if (role === "employee" && !employeeId) {
    return res.status(400).json({ error: "Employee ID is required for employee accounts" });
  }

  const users = readUsers();

  if (users.some((u) => u.username === username)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;

  const newUser = { id: newId, username, passwordHash, role, name };
  if (role === "employee" || employeeId) newUser.employeeId = Number(employeeId);

  users.push(newUser);
  writeUsers(users);

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

router.delete("/:id", authorize("superadmin", "admin"), (req, res) => {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (users[index].id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  if (req.user.role === "admin" && users[index].role === "superadmin") {
    return res.status(403).json({ error: "You cannot delete a super admin account" });
  }

  const deleted = users.splice(index, 1)[0];
  writeUsers(users);

  const { passwordHash, ...safeUser } = deleted;
  res.json(safeUser);
});

module.exports = router;
