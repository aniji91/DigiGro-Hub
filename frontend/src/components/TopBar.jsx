import { Bell, Search } from "lucide-react";

export default function TopBar({ user, roleLabel, roleColor }) {
  return (
    <header className="crm-topbar">
      <div className="topbar-search">
        <Search size={18} />
        <input type="text" placeholder="Search employees, projects, clients..." />
      </div>
      <div className="topbar-actions">
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="topbar-user">
          <div>
            <strong>{user.name}</strong>
            <span style={{ color: roleColor }}>{roleLabel}</span>
          </div>
          <div className="user-avatar sm" style={{ background: roleColor }}>
            {user.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
