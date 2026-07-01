import {
  LayoutDashboard,
  UserCog,
  Building2,
  FolderKanban,
  CalendarDays,
  Settings,
  Briefcase,
  ClipboardList,
  MessageSquare,
  Calendar,
  Shield,
  Megaphone,
  LayoutList,
  CircleUser,
} from "lucide-react";

export const MENU_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["superadmin", "admin", "hr", "product_manager", "employee"],
  },
  {
    key: "clients",
    label: "Clients",
    path: "/clients",
    icon: Building2,
    roles: ["superadmin", "product_manager"],
  },
  {
    key: "employees",
    label: "Employees",
    path: "/employees",
    icon: Briefcase,
    roles: ["superadmin", "admin", "hr"],
  },
  {
    key: "projects",
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
    roles: ["superadmin", "admin", "product_manager"],
  },
  {
    key: "pmBoard",
    label: "Project Status Board",
    path: "/pm-board",
    icon: ClipboardList,
    roles: ["superadmin", "admin", "product_manager"],
  },
  {
    key: "viewProjects",
    label: "View Projects",
    path: "/view-projects",
    icon: LayoutList,
    roles: ["superadmin", "admin", "product_manager"],
  },
  {
    key: "myProjects",
    label: "My Projects",
    path: "/view-projects",
    icon: FolderKanban,
    roles: ["employee"],
  },
  {
    key: "workLogs",
    label: "Daily Work Updates",
    path: "/daily-work",
    icon: ClipboardList,
    roles: ["employee", "product_manager", "hr"],
  },
  {
    key: "leaves",
    label: "Leave Management",
    path: "/leaves",
    icon: CalendarDays,
    roles: ["superadmin", "admin", "hr"],
  },
  {
    key: "myLeaves",
    label: "My Leaves",
    path: "/leaves",
    icon: CalendarDays,
    roles: ["employee"],
  },
  {
    key: "holidays",
    label: "Holiday Calendar",
    path: "/holidays",
    icon: Calendar,
    roles: ["superadmin", "hr"],
  },
  {
    key: "holidayView",
    label: "Holiday Calendar",
    path: "/holidays",
    icon: Calendar,
    roles: ["employee"],
  },
  {
    key: "announcements",
    label: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    roles: ["superadmin", "admin", "hr", "product_manager", "employee"],
  },
  {
    key: "chat",
    label: "Team Chat",
    path: "/chat",
    icon: MessageSquare,
    roles: ["superadmin", "admin", "hr", "product_manager", "employee"],
  },
  {
    key: "users",
    label: "Users",
    path: "/users",
    icon: UserCog,
    roles: ["superadmin", "admin", "hr"],
    module: "users",
  },
  {
    key: "roles",
    label: "Roles",
    path: "/roles",
    icon: Shield,
    roles: ["superadmin", "admin"],
    module: "roles",
  },
  {
    key: "profile",
    label: "My Profile",
    path: "/profile",
    icon: CircleUser,
    roles: ["superadmin", "admin", "hr", "product_manager", "employee"],
  },
  {
    key: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    roles: ["superadmin"],
  },
];

export function getMenuForRole(role, permissions = {}) {
  return MENU_ITEMS.filter((item) => {
    if (item.module && permissions[item.module] !== undefined) {
      return permissions[item.module]?.view;
    }
    return item.roles.includes(role);
  });
}

export const ROLE_LABELS = {
  superadmin: "Super Admin",
  admin: "Admin",
  hr: "HR Manager",
  product_manager: "Product Manager",
  employee: "Employee",
};

export const ROLE_COLORS = {
  superadmin: "#8b5cf6",
  admin: "#3b82f6",
  hr: "#10b981",
  product_manager: "#f59e0b",
  employee: "#06b6d4",
};
