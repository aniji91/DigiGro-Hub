import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { useChatNotifications } from "../context/ChatNotificationContext";
import AppLogo from "./AppLogo";

export default function Sidebar({ menuItems, user, roleLabel, roleColor, onLogout, collapsed, onToggle }) {
  const { totalUnread } = useChatNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className={`crm-sidebar ${collapsed ? "crm-sidebar--collapsed" : ""}`}>
      <div className="sidebar-brand">
        <AppLogo size="sm" layout="inline" />
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const badge = item.key === "chat" && totalUnread > 0 ? totalUnread : null;
          const isChatRoute = item.path === "/chat" && location.pathname.startsWith("/chat");
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive: navActive }) => `nav-item ${navActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              <span className="nav-item-label">{item.label}</span>
              {badge && (
                <span className={`nav-badge ${isChatRoute ? "nav-badge--active-route" : ""}`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="user-chip user-chip--clickable"
          title={collapsed ? user.name : "My profile"}
          onClick={() => navigate("/profile")}
        >
          <div className="user-avatar" style={{ background: roleColor }}>
            {user.name.charAt(0)}
          </div>
          <div className="user-chip-text">
            <strong>{user.name}</strong>
            <span>{roleLabel}</span>
          </div>
        </button>
        <button type="button" className="logout-btn" onClick={onLogout} title={collapsed ? "Logout" : undefined}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
