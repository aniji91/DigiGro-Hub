import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, CalendarDays, Briefcase, ClipboardList } from "lucide-react";
import { fetchDashboardStats } from "../../api/crmApi";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DashboardCelebrations, { DashboardAnnouncementStrip } from "../../components/DashboardCelebrations";

export default function HrDashboard() {
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
      <PageHeader title="HR Dashboard" subtitle="Employee management and leave tracking" />
      <DashboardCelebrations celebrations={data.celebrations || []} />
      <DashboardAnnouncementStrip announcements={data.announcements || []} />
      <div className="stats-grid cols-4">
        <StatCard label="Employees" value={stats.employees} icon={Users} color="#10b981" />
        <StatCard label="Pending Leaves" value={stats.pendingLeaves} icon={CalendarDays} color="#f59e0b" />
        <StatCard label="Work Updates Today" value={stats.todayLogs || 0} icon={ClipboardList} color="#3b82f6" />
        <StatCard label="Departments" value={stats.departments} icon={Briefcase} color="#8b5cf6" />
      </div>
      <div className="dashboard-panels two-col">
        <div className="panel">
          <h3>Recent Leave Requests</h3>
          <ul className="panel-list">
            {data.recentLeaves.map((l) => (
              <li key={l.id}>
                <div><strong>{l.employeeName}</strong><span>{l.startDate} → {l.endDate}</span></div>
                <span className={`badge status-${l.status.toLowerCase()}`}>{l.status}</span>
              </li>
            ))}
          </ul>
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
