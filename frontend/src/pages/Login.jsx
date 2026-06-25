import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, Users, Briefcase, FolderKanban, User } from "lucide-react";
import { login } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import AppLogo from "../components/AppLogo";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", user: "superadmin", pass: "superadmin123", icon: Shield, color: "#8b5cf6" },
  { role: "Admin", user: "admin", pass: "admin123", icon: Users, color: "#3b82f6" },
  { role: "HR", user: "hr", pass: "hr123", icon: Briefcase, color: "#10b981" },
  { role: "Product Manager", user: "pm", pass: "pm123", icon: FolderKanban, color: "#f59e0b" },
  { role: "Employee", user: "aniji", pass: "employee123", icon: User, color: "#06b6d4" },
];

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loginSuccess } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      loginSuccess(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setUsername(account.user);
    setPassword(account.pass);
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <AppLogo size="lg" />
        </div>
        <div className="login-features">
          <div className="feature-item">
            <Shield size={20} />
            <span>Super Admin — full system control</span>
          </div>
          <div className="feature-item">
            <Users size={20} />
            <span>Admin — projects & employees</span>
          </div>
          <div className="feature-item">
            <Briefcase size={20} />
            <span>HR — employees & leave management</span>
          </div>
          <div className="feature-item">
            <FolderKanban size={20} />
            <span>Product Manager — projects & assignments</span>
          </div>
          <div className="feature-item">
            <User size={20} />
            <span>Employee — projects & daily work logs</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to your account</p>

          {error && <div className="alert error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Username or Email
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="e.g. harish or harish@digigro.tech" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button type="submit" className="btn-primary full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <p className="login-employee-hint">
              Employees: use your email username (before @) or full email. Default password: <strong>employee123</strong>
            </p>
          </form>

          <div className="demo-accounts">
            <span>Quick demo access</span>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.user}
                    type="button"
                    className="demo-chip"
                    style={{ borderColor: account.color }}
                    onClick={() => fillDemo(account)}
                  >
                    <Icon size={14} style={{ color: account.color }} />
                    {account.role}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
