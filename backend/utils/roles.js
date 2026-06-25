const { readData, writeData, dataPath, nextId } = require("./jsonStore");

const FILE = dataPath("roles.json");

const MODULE_KEYS = [
  "clients",
  "employees",
  "projects",
  "myProjects",
  "workLogs",
  "leaves",
  "holidays",
  "announcements",
  "chat",
  "users",
  "roles",
  "settings",
];

const ACCESS_LEVELS = ["read", "cr", "cru", "crud"];

function readRoles() {
  return readData(FILE);
}

function writeRoles(roles) {
  writeData(FILE, roles);
}

function getRoleByKey(key) {
  return readRoles().find((r) => r.key === key);
}

function getRoleLabels() {
  return Object.fromEntries(readRoles().map((r) => [r.key, r.label]));
}

function getRoleColors() {
  return Object.fromEntries(readRoles().map((r) => [r.key, r.color]));
}

function getValidRoleKeys() {
  return readRoles().map((r) => r.key);
}

function getAssignableRoles(actorRole) {
  if (actorRole === "superadmin") {
    return readRoles().map((r) => r.key);
  }
  return readRoles()
    .filter((r) => (r.assignableBy || []).includes(actorRole))
    .map((r) => r.key);
}

function canAssignRole(actorRole, targetRole) {
  if (actorRole === "superadmin") {
    return Boolean(getRoleByKey(targetRole));
  }
  const role = getRoleByKey(targetRole);
  if (!role) return false;
  return (role.assignableBy || []).includes(actorRole);
}

function getEmployeeRoleOptions(actorRole) {
  const labels = getRoleLabels();
  return readRoles().map((role) => ({
    value: role.key,
    label: role.label,
    color: role.color,
    description: role.description || "",
    canAssign: canAssignRole(actorRole, role.key),
  }));
}

function getModulePermissions(roleKey) {
  const role = getRoleByKey(roleKey);
  return role?.modulePermissions || {};
}

function slugifyKey(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

module.exports = {
  MODULE_KEYS,
  ACCESS_LEVELS,
  readRoles,
  writeRoles,
  getRoleByKey,
  getRoleLabels,
  getRoleColors,
  getValidRoleKeys,
  getAssignableRoles,
  canAssignRole,
  getEmployeeRoleOptions,
  getModulePermissions,
  slugifyKey,
};
