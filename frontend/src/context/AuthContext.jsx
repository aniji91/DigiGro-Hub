import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { ROLE_LABELS as FALLBACK_LABELS } from "../config/menuConfig";
import { fetchMyRolePermissions, fetchRoleLabels } from "../api/roleApi";
import { canCreate, canDelete, canEdit, canView } from "../config/permissions";

const AuthContext = createContext(null);

const MODULES = [
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [modulePermissions, setModulePermissions] = useState(null);
  const [roleLabels, setRoleLabels] = useState(FALLBACK_LABELS);

  useEffect(() => {
    if (!user) {
      setModulePermissions(null);
      return;
    }
    fetchMyRolePermissions()
      .then((data) => setModulePermissions(data.modulePermissions || {}))
      .catch(() => setModulePermissions(null));
    fetchRoleLabels()
      .then(setRoleLabels)
      .catch(() => setRoleLabels(FALLBACK_LABELS));
  }, [user]);

  function loginSuccess({ token, user: loggedInUser }) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setModulePermissions(null);
  }

  const permissions = useMemo(() => {
    if (!user) return {};
    const role = user.role;
    return Object.fromEntries(
      MODULES.map((mod) => [
        mod,
        {
          view: canView(role, mod, modulePermissions),
          create: canCreate(role, mod, modulePermissions),
          edit: canEdit(role, mod, modulePermissions),
          delete: canDelete(role, mod, modulePermissions),
        },
      ])
    );
  }, [user, modulePermissions]);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    roleLabel: user ? roleLabels[user.role] || FALLBACK_LABELS[user.role] || user.role : "",
    roleLabels,
    modulePermissions,
    permissions,
    loginSuccess,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
