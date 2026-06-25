import { useEffect, useState } from "react";
import { Users, FolderKanban, Briefcase } from "lucide-react";
import { fetchDashboardStats } from "../../api/crmApi";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DashboardCelebrations, { DashboardAnnouncementStrip } from "../../components/DashboardCelebrations";

export default function AdminDashboard() {
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
      <PageHeader title="Admin Dashboard" subtitle="Manage projects and employee records" />
      <DashboardCelebrations celebrations={data.celebrations || []} />
      <DashboardAnnouncementStrip announcements={data.announcements || []} />
      <div className="stats-grid cols-4">
        <StatCard label="Employees" value={stats.employees} icon={Users} color="#3b82f6" />
        <StatCard label="Projects" value={stats.projects} icon={FolderKanban} color="#f59e0b" subtext={`${stats.activeProjects} active`} />
        <StatCard label="Departments" value={stats.departments} icon={Briefcase} color="#10b981" />
      </div>
      <div className="dashboard-panels two-col">
        <div className="panel">
          <h3>Active Projects</h3>
          <ul className="panel-list">
            {data.recentProjects.map((p) => (
              <li key={p.id}>
                <div><strong>{p.name}</strong><span>{p.clientName} · {p.startDate}</span></div>
                <span className="badge">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Team Members</h3>
          <ul className="panel-list">
            {data.recentEmployees.map((e) => (
              <li key={e.id}>
                <div><strong>{e.name}</strong><span>{e.email}</span></div>
                <span className="badge">{e.department}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
