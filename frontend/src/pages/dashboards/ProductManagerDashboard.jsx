import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Users, Clock } from "lucide-react";
import { fetchDashboardStats } from "../../api/crmApi";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DashboardCelebrations, { DashboardAnnouncementStrip } from "../../components/DashboardCelebrations";

export default function ProductManagerDashboard() {
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
      <PageHeader title="Product Manager Dashboard" subtitle="Create projects and assign team members" />
      <DashboardCelebrations celebrations={data.celebrations || []} />
      <DashboardAnnouncementStrip announcements={data.announcements || []} />
      <div className="stats-grid cols-4">
        <StatCard label="Total Projects" value={stats.projects} icon={FolderKanban} color="#f59e0b" />
        <StatCard label="Active Projects" value={stats.activeProjects} icon={FolderKanban} color="#3b82f6" />
        <StatCard label="Team Members Assigned" value={stats.teamMembers} icon={Users} color="#10b981" />
        <StatCard label="Logged Today" value={stats.todayLogs || 0} icon={Clock} color="#8b5cf6" subtext="work entries" />
      </div>
      <div className="dashboard-panels two-col">
        <div className="panel">
          <h3>Your Projects</h3>
          <ul className="panel-list">
            {data.recentProjects.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.clientName} · {(p.assignedEmployeeIds || []).length} members assigned</span>
                </div>
                <span className="badge">{p.status}</span>
              </li>
            ))}
          </ul>
          <Link to="/pm-board" className="panel-link">Open status board →</Link>
        </div>
        <div className="panel">
          <h3>Recent Work Updates</h3>
          <ul className="panel-list">
            {(data.recentWorkLogs || []).length > 0 ? (
              data.recentWorkLogs.map((log) => (
                <li key={log.id}>
                  <div>
                    <strong>{log.employeeName}</strong>
                    <span>{log.projectName} · {log.date} · {log.hoursWorked}h</span>
                  </div>
                  <span className="badge">{log.progress}</span>
                </li>
              ))
            ) : (
              <li><span className="muted">No work updates yet</span></li>
            )}
          </ul>
          <Link to="/daily-work" className="panel-link">Log today's work →</Link>
        </div>
      </div>
    </>
  );
}
