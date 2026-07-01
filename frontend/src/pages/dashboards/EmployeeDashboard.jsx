import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, ClipboardList, Clock, CalendarDays, ListChecks } from "lucide-react";
import { fetchDashboardStats } from "../../api/crmApi";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DashboardCelebrations, { DashboardAnnouncementStrip } from "../../components/DashboardCelebrations";

export default function EmployeeDashboard() {
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
      <PageHeader title="My Dashboard" subtitle="Your projects, work logs, and leave requests" />
      <DashboardCelebrations celebrations={data.celebrations || []} />
      <DashboardAnnouncementStrip announcements={data.announcements || []} />
      <div className="stats-grid cols-4">
        <StatCard label="Assigned Projects" value={stats.assignedProjects} icon={FolderKanban} color="#3b82f6" />
        <StatCard label="Work Logs" value={stats.totalWorkLogs} icon={ClipboardList} color="#10b981" />
        <StatCard label="Pending Onboarding" value={stats.pendingOnboarding || 0} icon={ListChecks} color="#f59e0b" />
        <StatCard label="Logged Today" value={stats.todayLogs} icon={Clock} color="#8b5cf6" subtext="work entries" />
      </div>

      {(data.pendingOnboarding || []).length > 0 && (
        <div className="alert warning" style={{ marginBottom: "1rem" }}>
          You have {stats.pendingOnboarding} project onboarding checklist{stats.pendingOnboarding > 1 ? "s" : ""} to complete before logging work.
        </div>
      )}

      <div className="dashboard-panels">
        <div className="panel">
          <h3>My Projects</h3>
          <ul className="panel-list">
            {(data.myProjects || []).map((p) => (
              <li key={p.id}>
                <div><strong>{p.name}</strong><span>{p.clientName}</span></div>
                <span className="badge">{p.status}</span>
              </li>
            ))}
          </ul>
          <Link to="/view-projects" className="panel-link">View all projects →</Link>
        </div>
        <div className="panel">
          <h3>Project Onboarding</h3>
          <ul className="panel-list">
            {(data.pendingOnboarding || []).length > 0 ? (
              data.pendingOnboarding.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.projectName}</strong>
                    <span>{item.completedSteps}/{item.totalSteps} steps done</span>
                  </div>
                  <span className="badge status-pending">{item.status}</span>
                </li>
              ))
            ) : (
              <li><span className="muted">All project onboarding complete</span></li>
            )}
          </ul>
          <Link to="/view-projects" className="panel-link">Complete onboarding →</Link>
        </div>
        <div className="panel">
          <h3>Recent Work Updates</h3>
          <ul className="panel-list">
            {(data.recentWorkLogs || []).map((log) => (
              <li key={log.id}>
                <div><strong>{log.projectName}</strong><span>{log.date} · {log.hoursWorked}h</span></div>
                <span className="badge">{log.progress}</span>
              </li>
            ))}
          </ul>
          <Link to="/daily-work" className="panel-link">Log today's work →</Link>
        </div>
        <div className="panel">
          <h3>My Leave Requests</h3>
          <ul className="panel-list">
            {(data.recentLeaves || []).map((leave) => (
              <li key={leave.id}>
                <div><strong>{leave.type}</strong><span>{leave.startDate} → {leave.endDate}</span></div>
                <span className={`badge status-${leave.status.toLowerCase()}`}>{leave.status}</span>
              </li>
            ))}
          </ul>
          <Link to="/leaves" className="panel-link">Apply for leave →</Link>
        </div>
        <div className="panel">
          <h3>Upcoming Holidays</h3>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>View the full {new Date().getFullYear()} calendar</p>
          <Link to="/holidays" className="panel-link">Open holiday calendar →</Link>
        </div>
      </div>
    </>
  );
}
