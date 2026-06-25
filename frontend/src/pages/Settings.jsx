import { useAuth } from "../context/AuthContext";
import { ROLE_COLORS } from "../config/menuConfig";
import { APP_NAME, APP_VERSION } from "../config/branding";
import { API_ROOT } from "../api/config";
import PageHeader from "../components/PageHeader";

export default function Settings() {
  const { user, roleLabel } = useAuth();

  return (
    <>
      <PageHeader title="Settings" subtitle="System configuration and preferences" />
      <div className="settings-grid">
        <div className="panel">
          <h3>Account</h3>
          <ul className="report-stats">
            <li><span>Name</span><strong>{user.name}</strong></li>
            <li><span>Username</span><strong>@{user.username}</strong></li>
            <li><span>Role</span><strong style={{ color: ROLE_COLORS[user.role] }}>{roleLabel}</strong></li>
          </ul>
        </div>
        <div className="panel">
          <h3>System</h3>
          <ul className="report-stats">
            <li><span>Application</span><strong>{APP_NAME} v{APP_VERSION}</strong></li>
            <li><span>API</span><strong>{API_ROOT}</strong></li>
            <li><span>Session</span><strong>8 hours</strong></li>
          </ul>
        </div>
        <div className="panel">
          <h3>Security</h3>
          <p className="muted">JWT-based authentication with role-based access control. Contact your Super Admin to manage user accounts.</p>
        </div>
      </div>
    </>
  );
}
