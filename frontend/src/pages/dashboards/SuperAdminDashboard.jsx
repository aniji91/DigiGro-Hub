import { useEffect, useState } from "react";
import { Users, Building2, FolderKanban, CalendarDays, UserCog } from "lucide-react";
import { fetchDashboardStats } from "../../api/crmApi";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DashboardCelebrations, { DashboardAnnouncementStrip } from "../../components/DashboardCelebrations";

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="loading-state">Loading dashboard...</div>;

  const { stats } = data;

  return (
    <>
      <PageHeader title="Super Admin Dashboard" subtitle="Full control over employees, clients, projects & leaves" />
      <DashboardCelebrations celebrations={data.celebrations || []} />
      <DashboardAnnouncementStrip announcements={data.announcements || []} />
      <div className="stats-grid">
        <StatCard label="Employees" value={stats.employees} icon={Users} color="#3b82f6" />
        <StatCard label="Clients" value={stats.clients} icon={Building2} color="#8b5cf6" />
        <StatCard label="Projects" value={stats.projects} icon={FolderKanban} color="#f59e0b" subtext={`${stats.activeProjects} active`} />
        <StatCard label="Pending Leaves" value={stats.pendingLeaves} icon={CalendarDays} color="#10b981" />
        <StatCard label="System Users" value={stats.users} icon={UserCog} color="#6366f1" />
      </div>
      <div className="dashboard-panels">
        <div className="panel">
          <h3>Recent Projects</h3>
          <ul className="panel-list">
            {data.recentProjects.map((p) => (
              <li key={p.id}>
                <div><strong>{p.name}</strong><span>{p.clientName}</span></div>
                <span className="badge">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Recent Leave Requests</h3>
          <ul className="panel-list">
            {data.recentLeaves.map((l) => (
              <li key={l.id}>
                <div><strong>{l.employeeName}</strong><span>{l.type}</span></div>
                <span className={`badge status-${l.status.toLowerCase()}`}>{l.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Recent Employees</h3>
          <ul className="panel-list">
            {data.recentEmployees.map((e) => (
              <li key={e.id}>
                <div><strong>{e.name}</strong><span>{e.position}</span></div>
                <span className="badge">{e.department}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
