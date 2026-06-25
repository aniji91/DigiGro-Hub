const MODULE_ACCESS = {
  superadmin: {
    clients: "crud",
    employees: "crud",
    projects: "crud",
    leaves: "crud",
    holidays: "crud",
    announcements: "crud",
    users: "crud",
    roles: "crud",
    settings: "read",
    workLogs: "read",
    chat: "crud",
  },
  admin: {
    employees: "crud",
    projects: "crud",
    users: "cru",
    roles: "read",
    workLogs: "read",
    announcements: "read",
    chat: "read",
  },
  hr: {
    employees: "cru",
    leaves: "crud",
    holidays: "crud",
    announcements: "crud",
    users: "cr",
    workLogs: "cru",
    chat: "read",
  },
  product_manager: {
    projects: "cru",
    employees: "read",
    workLogs: "cru",
    announcements: "read",
    chat: "crud",
  },
  employee: {
    myProjects: "read",
    workLogs: "cru",
    leaves: "cru",
    holidays: "read",
    announcements: "read",
    chat: "read",
  },
};

export function getModuleAccess(role, module, dynamicPerms = null) {
  if (dynamicPerms && dynamicPerms[module]) return dynamicPerms[module];
  return MODULE_ACCESS[role]?.[module] || null;
}

export function canCreate(role, module, dynamicPerms = null) {
  const access = getModuleAccess(role, module, dynamicPerms);
  return access === "crud" || access === "cru" || access === "cr";
}

export function canEdit(role, module, dynamicPerms = null) {
  const access = getModuleAccess(role, module, dynamicPerms);
  return access === "crud" || access === "cru";
}

export function canDelete(role, module, dynamicPerms = null) {
  const access = getModuleAccess(role, module, dynamicPerms);
  return access === "crud";
}

export function canView(role, module, dynamicPerms = null) {
  return Boolean(getModuleAccess(role, module, dynamicPerms));
}
