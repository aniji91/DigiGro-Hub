const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate, JWT_SECRET } = require("../middleware/auth");
const { readData, writeData, dataPath } = require("../utils/jsonStore");

const router = express.Router();
const USERS_FILE = dataPath("users.json");
const EMPLOYEES_FILE = dataPath("employees.json");

function readUsers() {
  return readData(USERS_FILE);
}

function writeUsers(users) {
  writeData(USERS_FILE, users);
}

function readEmployees() {
  return readData(EMPLOYEES_FILE);
}

function writeEmployees(employees) {
  writeData(EMPLOYEES_FILE, employees);
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

function findUserById(id) {
  return readUsers().find((u) => u.id === Number(id)) || null;
}

function getLinkedEmployee(user) {
  if (!user?.employeeId) return null;
  return readEmployees().find((e) => e.id === user.employeeId) || null;
}

function safeUserPayload(user, employee = null) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
    ...(employee
      ? {
          email: employee.email,
          department: employee.department || "",
          position: employee.position || "",
        }
      : {}),
  };
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

router.get("/me", authenticate, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(safeUserPayload(user, getLinkedEmployee(user)));
});

router.patch("/me", authenticate, (req, res) => {
  const { name, username } = req.body;
  const trimmedName = (name || "").trim();
  const trimmedUsername = (username || "").trim();

  if (!trimmedName || !trimmedUsername) {
    return res.status(400).json({ error: "Name and username are required" });
  }

  const users = readUsers();
  const index = users.findIndex((u) => u.id === req.user.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });

  const usernameTaken = users.some(
    (u) => u.id !== req.user.id && u.username.toLowerCase() === trimmedUsername.toLowerCase()
  );
  if (usernameTaken) {
    return res.status(409).json({ error: "Username already exists" });
  }

  users[index] = {
    ...users[index],
    name: trimmedName,
    username: trimmedUsername,
  };
  writeUsers(users);

  if (users[index].employeeId) {
    const employees = readEmployees();
    const employeeIndex = employees.findIndex((e) => e.id === users[index].employeeId);
    if (employeeIndex >= 0) {
      employees[employeeIndex] = { ...employees[employeeIndex], name: trimmedName };
      writeEmployees(employees);
    }
  }

  const employee = getLinkedEmployee(users[index]);
  res.json(safeUserPayload(users[index], employee));
});

router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  const users = readUsers();
  const index = users.findIndex((u) => u.id === req.user.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });

  const user = users[index];
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  users[index] = {
    ...user,
    passwordHash: await bcrypt.hash(newPassword, 10),
  };
  writeUsers(users);

  res.json({ message: "Password updated successfully" });
});

module.exports = router;
