const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");
const { readData, dataPath } = require("../utils/jsonStore");

const router = express.Router();
const USERS_FILE = dataPath("users.json");
const EMPLOYEES_FILE = dataPath("employees.json");

function readUsers() {
  return readData(USERS_FILE);
}

function readEmployees() {
  return readData(EMPLOYEES_FILE);
}

function findUserByLogin(login) {
  const value = login.trim().toLowerCase();
  const users = readUsers();
  let user = users.find((u) => u.username.toLowerCase() === value);
  if (user) return user;

  const employee = readEmployees().find((e) => e.email.trim().toLowerCase() === value);
  if (employee) {
    user = users.find((u) => u.employeeId === employee.id);
  }
  return user || null;
}

function createToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  };
  if (user.employeeId) payload.employeeId = user.employeeId;

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const users = readUsers();
  const user = findUserByLogin(username);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = createToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      ...(user.employeeId ? { employeeId: user.employeeId } : {}),
    },
  });
});

module.exports = router;
