import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useChatNotifications } from "../context/ChatNotificationContext";
import AppLogo from "./AppLogo";

export default function Sidebar({ menuItems, user, roleLabel, roleColor, onLogout }) {
  const { totalUnread } = useChatNotifications();

  return (
    <aside className="crm-sidebar">
      <div className="sidebar-brand">
        <AppLogo size="sm" layout="inline" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const badge = item.key === "chat" && totalUnread > 0 ? totalUnread : null;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {badge && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar" style={{ background: roleColor }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
