const express = require("express");
const { authenticate } = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { readData, writeData, dataPath } = require("../utils/jsonStore");
const { ensureEmployeeUser, syncAllEmployeeUsers, syncEmployeeUserProfile, enrichEmployeesWithLogin } = require("../utils/employeeUsers");
const { canAssignRole, getEmployeeRoleOptions } = require("../utils/roles");

const router = express.Router();

router.use(authenticate);
const DATA_FILE = dataPath("employees.json");

function readEmployees() {
  return readData(DATA_FILE);
}

function writeEmployees(employees) {
  writeData(DATA_FILE, employees);
}

function normalizeSalary(salary) {
  if (salary === undefined || salary === null || salary === "") return null;
  const value = Number(salary);
  return Number.isFinite(value) ? value : null;
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((doc) => doc?.name && doc?.dataUrl)
    .map((doc) => ({
      name: doc.name,
      mimeType: doc.mimeType || "application/octet-stream",
      dataUrl: doc.dataUrl,
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
    }));
}

function normalizeEmergencyContacts(contacts) {
  if (!Array.isArray(contacts)) return [];
  return contacts
    .map((contact) => ({
      name: (contact.name || "").trim(),
      relationship: (contact.relationship || "").trim(),
      phone: (contact.phone || "").trim(),
      email: (contact.email || "").trim(),
    }))
    .filter((contact) => contact.name || contact.phone);
}

function buildEmployeePayload(body, existing = {}) {
  const {
    name,
    email,
    department,
    position,
    salary,
    dob,
    joiningDate,
    documents,
    emergencyContacts,
  } = body;

  return {
    name: name ?? existing.name,
    email: email ?? existing.email,
    department: department ?? existing.department,
    position: position ?? existing.position,
    salary: salary !== undefined ? normalizeSalary(salary) : existing.salary ?? null,
    dob: dob !== undefined ? dob || "" : existing.dob || "",
    joiningDate: joiningDate !== undefined ? joiningDate || "" : existing.joiningDate || "",
    documents:
      documents !== undefined ? normalizeDocuments(documents) : existing.documents || [],
    emergencyContacts:
      emergencyContacts !== undefined
        ? normalizeEmergencyContacts(emergencyContacts)
        : existing.emergencyContacts || [],
  };
}

// GET /api/employees — list all employees
router.get("/", async (req, res) => {
  const employees = readEmployees();
  await syncAllEmployeeUsers(employees);
  res.json(enrichEmployeesWithLogin(employees));
});

// GET /api/employees/meta/assignable-roles
router.get("/meta/assignable-roles", authorize("superadmin", "admin", "hr"), (req, res) => {
  const roles = getEmployeeRoleOptions(req.user.role);
  res.json({ roles });
});

// GET /api/employees/:id — get one employee
router.get("/:id", (req, res) => {
  const employees = readEmployees();
  const employee = employees.find((e) => e.id === Number(req.params.id));

  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  res.json(employee);
});

// POST /api/employees — create new employee (admin, superadmin, hr)
router.post("/", authorize("superadmin", "admin", "hr"), async (req, res) => {
  const { role } = req.body;

  if (!req.body.name || !req.body.email || !req.body.department || !req.body.position || !role) {
    return res.status(400).json({ error: "Name, email, department, position, and role are required" });
  }

  if (!canAssignRole(req.user.role, role)) {
    return res.status(403).json({ error: "You cannot assign this role" });
  }

  const employees = readEmployees();
  const newId = employees.length > 0 ? Math.max(...employees.map((e) => e.id)) + 1 : 1;

  const newEmployee = {
    id: newId,
    ...buildEmployeePayload(req.body),
  };

  employees.push(newEmployee);
  writeEmployees(employees);

  await ensureEmployeeUser(newEmployee, role);

  res.status(201).json(enrichEmployeesWithLogin([newEmployee])[0]);
});

// PUT /api/employees/:id — update employee (admin, superadmin, hr)
router.put("/:id", authorize("superadmin", "admin", "hr"), async (req, res) => {
  const employees = readEmployees();
  const index = employees.findIndex((e) => e.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const { role } = req.body;

  if (role && !canAssignRole(req.user.role, role)) {
    return res.status(403).json({ error: "You cannot assign this role" });
  }

  employees[index] = {
    ...employees[index],
    ...buildEmployeePayload(req.body, employees[index]),
  };

  writeEmployees(employees);

  const users = readData(dataPath("users.json"));
  const linkedUser = users.find((u) => u.employeeId === employees[index].id);
  const nextRole = role || linkedUser?.role || "employee";

  await syncEmployeeUserProfile(employees[index], nextRole);
  res.json(enrichEmployeesWithLogin([employees[index]])[0]);
});

// DELETE /api/employees/:id — remove employee (admin, superadmin only)
router.delete("/:id", authorize("superadmin", "admin"), (req, res) => {
  const employees = readEmployees();
  const index = employees.findIndex((e) => e.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const deleted = employees.splice(index, 1)[0];
  writeEmployees(employees);

  res.json(deleted);
});

module.exports = router;
