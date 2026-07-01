import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyProjects, projectsApi, workLogsApi } from "../api/crmApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  projectId: "",
  date: today(),
  hoursWorked: "",
  workDescription: "",
  progress: "In Progress",
};

const TEAM_ROLES = new Set(["hr", "product_manager", "admin", "superadmin"]);

function isOwnLog(log, user) {
  if (!log || !user) return false;
  if (log.userId != null) return log.userId === user.id;
  return user.employeeId != null && log.employeeId === user.employeeId;
}

export default function DailyWork() {
  const { permissions, user } = useAuth();
  const perms = permissions.workLogs || {};
  const isTeamView = TEAM_ROLES.has(user?.role);
  const location = useLocation();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const projectColumn = {
    key: "projectName",
    label: "Project",
    render: (v) => v || <span className="muted">—</span>,
  };

  const employeeColumns = [
    { key: "date", label: "Date" },
    projectColumn,
    { key: "hoursWorked", label: "Hours", render: (v) => `${v}h` },
    { key: "workDescription", label: "Task" },
    { key: "progress", label: "Progress", render: (v) => <span className="badge">{v}</span> },
  ];

  const teamColumns = [
    { key: "date", label: "Date" },
    { key: "employeeName", label: "Employee" },
    projectColumn,
    { key: "hoursWorked", label: "Hours", render: (v) => `${v}h` },
    { key: "workDescription", label: "Task" },
    { key: "progress", label: "Progress", render: (v) => <span className="badge">{v}</span> },
  ];

  const columns = isTeamView ? teamColumns : employeeColumns;

  async function load() {
    try {
      setError("");
      const [logData, projectData] = await Promise.all([
        workLogsApi.fetchAll(),
        isTeamView ? projectsApi.fetchAll() : fetchMyProjects(),
      ]);
      setLogs(
        isTeamView
          ? [...logData].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
          : logData
      );
      setProjects(projectData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [isTeamView]);

  useEffect(() => {
    if (!isTeamView && location.state?.projectId && projects.length > 0) {
      setForm((prev) => ({ ...prev, projectId: String(location.state.projectId) }));
      setShowModal(true);
    }
  }, [location.state, projects, isTeamView]);

  const employeeOptions = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => {
      const key = log.userId ?? log.employeeId;
      if (key != null && !map.has(key)) {
        map.set(key, log.employeeName);
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const displayedLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterProject) {
        if (filterProject === "none") {
          if (log.projectId != null) return false;
        } else if (log.projectId !== Number(filterProject)) {
          return false;
        }
      }
      if (filterEmployee) {
        const id = Number(filterEmployee);
        if (log.userId !== id && log.employeeId !== id) return false;
      }
      if (filterDate && log.date !== filterDate) return false;
      return true;
    });
  }, [logs, filterProject, filterEmployee, filterDate]);

  const totalHours = useMemo(
    () => displayedLogs.reduce((sum, log) => sum + Number(log.hoursWorked || 0), 0),
    [displayedLogs]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, date: today() });
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      projectId: row.projectId != null ? String(row.projectId) : "",
      date: row.date,
      hoursWorked: String(row.hoursWorked),
      workDescription: row.workDescription,
      progress: row.progress,
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      if (editing) {
        const updated = await workLogsApi.update(editing.id, {
          hoursWorked: form.hoursWorked,
          workDescription: form.workDescription,
          progress: form.progress,
        });
        setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await workLogsApi.create({
          ...form,
          projectId: form.projectId || null,
        });
        setLogs((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("onboarding")) {
        navigate("/my-projects");
      }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this work log?")) return;
    try {
      setError("");
      await workLogsApi.remove(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const pendingOnboarding = projects.filter((p) => p.onboardingRequired);

  const subtitle = isTeamView
    ? user?.role === "hr"
      ? "Log your own daily work and review updates submitted across all projects"
      : "Log your own daily work and track team updates across projects"
    : "Log what you worked on each day for your assigned projects";

  return (
    <>
      <PageHeader
        title="Daily Work Updates"
        subtitle={subtitle}
        actionLabel="Log Today's Work"
        onAction={openCreate}
        showAction={perms.create}
      />
      {!isTeamView && pendingOnboarding.length > 0 && (
        <div className="alert warning">
          Complete project onboarding before logging work on:{" "}
          {pendingOnboarding.map((p) => p.name).join(", ")}.{" "}
          <Link to="/my-projects">Go to My Projects →</Link>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {isTeamView && (
        <div className="work-log-filters">
          <label>
            Project
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">All projects</option>
              <option value="none">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Employee
            <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">All employees</option>
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </label>
          {(filterProject || filterEmployee || filterDate) && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setFilterProject("");
                setFilterEmployee("");
                setFilterDate("");
              }}
            >
              Clear filters
            </button>
          )}
          <div className="work-log-summary">
            <span>{displayedLogs.length} entries</span>
            <span>{totalHours}h total</span>
          </div>
        </div>
      )}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={displayedLogs}
          onEdit={openEdit}
          onDelete={handleDelete}
          canEdit={perms.edit}
          canEditRow={isTeamView ? (row) => isOwnLog(row, user) : undefined}
          canDelete={isTeamView || perms.delete}
          canDeleteRow={(row) => isTeamView || perms.delete || isOwnLog(row, user)}
        />
      )}

      {showModal && (
        <Modal title={editing ? "Update Work Log" : "Log Daily Work"} onClose={() => setShowModal(false)} wide>
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <label>
                Project
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  disabled={Boolean(editing)}
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={!isTeamView && p.onboardingRequired}
                    >
                      {p.name} — {p.clientName}{!isTeamView && p.onboardingRequired ? " (onboarding required)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  disabled={Boolean(editing)}
                />
              </label>
              <label>
                Hours Worked
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={form.hoursWorked}
                  onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
                  required
                />
              </label>
              <label>
                Task
                <textarea
                  rows={4}
                  value={form.workDescription}
                  onChange={(e) => setForm({ ...form, workDescription: e.target.value })}
                  placeholder="What task did you work on today?"
                  required
                />
              </label>
              <label>
                Progress Status
                <select value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })}>
                  <option>Planning</option>
                  <option>In Progress</option>
                  <option>On Hold</option>
                  <option>Completed</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? "Save Update" : "Submit Work Log"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
