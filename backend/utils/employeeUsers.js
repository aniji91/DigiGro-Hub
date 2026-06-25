const bcrypt = require("bcryptjs");
const { readData, writeData, dataPath, nextId } = require("./jsonStore");

const USERS_FILE = dataPath("users.json");
const DEFAULT_EMPLOYEE_PASSWORD = "employee123";

function readUsers() {
  return readData(USERS_FILE);
}

function writeUsers(users) {
  writeData(USERS_FILE, users);
}

function buildUsername(employee, users) {
  const base = (employee.email || employee.name)
    .trim()
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let username = base || `employee${employee.id}`;
  if (!users.some((u) => u.username === username)) return username;

  username = `${base}${employee.id}`;
  if (!users.some((u) => u.username === username)) return username;

  return `emp${employee.id}`;
}

async function ensureEmployeeUser(employee, role) {
  const users = readUsers();
  const existing = users.find((u) => u.employeeId === employee.id);
  if (existing) {
    if (role != null && role !== "" && existing.role !== role) {
      existing.role = role;
      writeUsers(users);
    }
    return existing;
  }

  const username = buildUsername(employee, users);
  const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
  const newUser = {
    id: nextId(users),
    username,
    passwordHash,
    role: role || "employee",
    name: employee.name,
    employeeId: employee.id,
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}

async function syncAllEmployeeUsers(employees) {
  const users = [];
  for (const employee of employees) {
    users.push(await ensureEmployeeUser(employee));
  }
  return users;
}

async function syncEmployeeUserProfile(employee, role) {
  const users = readUsers();
  const index = users.findIndex((u) => u.employeeId === employee.id);

  if (index >= 0) {
    users[index].name = employee.name;
    if (role != null && role !== "") {
      users[index].role = role;
    }
    writeUsers(users);
    return users[index];
  }

  return ensureEmployeeUser(employee, role || "employee");
}

function enrichEmployeesWithLogin(employees) {
  const users = readUsers();
  return employees.map((emp) => {
    const user = users.find((u) => u.employeeId === emp.id);
    return {
      ...emp,
      loginUsername: user?.username || null,
      loginRole: user?.role || null,
      canLogin: Boolean(user),
    };
  });
}

module.exports = {
  ensureEmployeeUser,
  syncAllEmployeeUsers,
  syncEmployeeUserProfile,
  enrichEmployeesWithLogin,
  DEFAULT_EMPLOYEE_PASSWORD,
};
