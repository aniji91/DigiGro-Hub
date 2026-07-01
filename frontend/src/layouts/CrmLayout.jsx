import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChatNotificationProvider } from "../context/ChatNotificationContext";
import { getMenuForRole, ROLE_COLORS } from "../config/menuConfig";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import ChatToastStack from "../components/ChatToastStack";

export default function CrmLayout() {
  const { user, logout, roleLabel, permissions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = getMenuForRole(user.role, permissions);
  const onChatPage = location.pathname.startsWith("/chat");
  const onProjectViewPage =
    location.pathname.startsWith("/view-projects") ||
    location.pathname.startsWith("/my-projects");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <ChatNotificationProvider>
      <div className={`crm-shell ${sidebarCollapsed ? "crm-shell--sidebar-collapsed" : ""}`}>
        <Sidebar
          menuItems={menuItems}
          user={user}
          roleLabel={roleLabel}
          roleColor={ROLE_COLORS[user.role]}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <ChatToastStack />
        <div className="crm-main">
          {!onChatPage && !onProjectViewPage && (
            <TopBar
              user={user}
              roleLabel={roleLabel}
              roleColor={ROLE_COLORS[user.role]}
              onLogout={handleLogout}
            />
          )}
          <div
            className={`crm-content ${onChatPage ? "crm-content--chat" : ""} ${onProjectViewPage ? "crm-content--full" : ""}`}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </ChatNotificationProvider>
  );
}
