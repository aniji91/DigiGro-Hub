import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Search } from "lucide-react";
import { useChatNotifications } from "../context/ChatNotificationContext";

export default function TopBar({ user, roleLabel, roleColor, onLogout }) {
  const navigate = useNavigate();
  const {
    totalUnread,
    totalMentions,
    notificationPermission,
    browserNotificationsEnabled,
    requestNotificationPermission,
  } = useChatNotifications();

  async function handleBellClick() {
    if (notificationPermission === "default") {
      await requestNotificationPermission();
    }
    navigate("/chat");
  }

  const showBadge = totalUnread > 0;
  const bellLabel = showBadge
    ? `${totalUnread} unread chat message${totalUnread === 1 ? "" : "s"}`
    : browserNotificationsEnabled
      ? "Team chat notifications enabled"
      : "Team chat notifications";

  return (
    <header className="crm-topbar">
      <div className="topbar-search">
        <Search size={18} />
        <input type="text" placeholder="Search employees, projects, clients..." />
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className={`icon-btn topbar-bell-btn ${showBadge ? "topbar-bell-btn--active" : ""}`}
          aria-label={bellLabel}
          title={bellLabel}
          onClick={handleBellClick}
        >
          <Bell size={18} />
          {showBadge && (
            <span className="topbar-bell-badge" aria-hidden="true">
              {totalMentions > 0 ? "@" : totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
        <button
          type="button"
          className="topbar-logout"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
        <button
          type="button"
          className="topbar-user"
          onClick={() => navigate("/profile")}
          title="My profile"
        >
          <div>
            <strong>{user.name}</strong>
            <span style={{ color: roleColor }}>{roleLabel}</span>
          </div>
          <div className="user-avatar sm" style={{ background: roleColor }}>
            {user.name.charAt(0)}
          </div>
        </button>
      </div>
    </header>
  );
}
