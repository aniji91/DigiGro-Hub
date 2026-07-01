import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyProjects, fetchProjectUpdates, projectsApi, workLogsApi } from "../api/crmApi";
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

const ENTRY_LABELS = {
  work_log: "Daily log",
  task: "Task",
  discussion: "Discussion",
};

function isOwnLog(log, user) {
  if (!log || !user) return false;
  if (log.userId != null) return log.userId === user.id;
  return user.employeeId != null && log.employeeId === user.employeeId;
}

function taskStatusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function normalizeFeed(workLogs, projectUpdates) {
  const logItems = workLogs.map((log) => ({
    id: `work-${log.id}`,
    sourceId: log.id,
    entryType: "work_log",
    date: log.date,
    projectId: log.projectId ?? null,
    projectName: log.projectName || "",
    employeeName: log.employeeName || "—",
    userId: log.userId ?? null,
    employeeId: log.employeeId ?? null,
    content: log.workDescription,
    hoursWorked: Number(log.hoursWorked || 0),
    statusLabel: log.progress || "—",
    authorName: log.employeeName || "—",
    raw: log,
  }));

  const updateItems = projectUpdates.map((update) => ({
    id: `update-${update.id}`,
    sourceId: update.id,
    entryType: update.type === "status" ? "task" : "discussion",
    date: update.date,
    projectId: update.projectId,
    projectName: update.projectName || "",
    employeeName: update.authorName || "—",
    userId: update.authorId ?? null,
    employeeId: null,
    content: update.content,
    hoursWorked: null,
    statusLabel: update.type === "status" ? update.taskStatus || "New" : "Discussion",
    authorName: update.authorName || "—",
    raw: update,
  }));

  return [...logItems, ...updateItems].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return String(b.id).localeCompare(String(a.id));
  });
}

export default function DailyWork() {
  const { permissions, user } = useAuth();
  const perms = permissions.workLogs || {};
  const isTeamView = TEAM_ROLES.has(user?.role);
  const location = useLocation();
  const navigate = useNavigate();

  const [workLogs, setWorkLogs] = useState([]);
  const [projectUpdates, setProjectUpdates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const feed = useMemo(
    () => normalizeFeed(workLogs, projectUpdates),
    [workLogs, projectUpdates]
  );

  const employeeOptions = useMemo(() => {
    const map = new Map();
    feed.forEach((item) => {
      const key = item.userId ?? item.employeeId ?? item.employeeName;
      if (key != null && !map.has(key)) {
        map.set(key, item.employeeName);
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [feed]);

  const displayedItems = useMemo(() => {
    return feed.filter((item) => {
      if (filterProject) {
        if (filterProject === "none") {
          if (item.projectId != null) return false;
        } else if (item.projectId !== Number(filterProject)) {
          return false;
        }
      }
      if (filterEmployee) {
        const id = Number(filterEmployee);
        if (item.userId !== id && item.employeeId !== id) return false;
      }
      if (filterDate && item.date !== filterDate) return false;
      return true;
    });
  }, [feed, filterProject, filterEmployee, filterDate]);

  const totalHours = useMemo(
    () =>
      displayedItems
        .filter((item) => item.entryType === "work_log")
        .reduce((sum, item) => sum + Number(item.hoursWorked || 0), 0),
    [displayedItems]
  );

  const entryCounts = useMemo(() => {
    const counts = { work_log: 0, task: 0, discussion: 0 };
    displayedItems.forEach((item) => {
      counts[item.entryType] += 1;
    });
    return counts;
  }, [displayedItems]);

  const columns = useMemo(() => {
    const base = [
      { key: "date", label: "Date" },
      ...(isTeamView ? [{ key: "employeeName", label: "Employee" }] : []),
      {
        key: "projectName",
        label: "Project",
        render: (v) => v || <span className="muted">—</span>,
      },
      {
        key: "entryType",
        label: "Type",
        render: (v) => (
          <span className={`badge point-type-${v === "discussion" ? "discussion" : v === "task" ? "status" : "work-log"}`}>
            {ENTRY_LABELS[v] || v}
          </span>
        ),
      },
      { key: "content", label: "Task / Details" },
      {
        key: "hoursWorked",
        label: "Hours",
        render: (v, row) => (row.entryType === "work_log" ? `${v}h` : "—"),
      },
      {
        key: "statusLabel",
        label: "Status",
        render: (v, row) =>
          row.entryType === "task" ? (
            <span className={`badge task-status task-status--${taskStatusClass(v)}`}>{v}</span>
          ) : (
            <span className="badge">{v}</span>
          ),
      },
    ];
    return base;
  }, [isTeamView]);

  async function load() {
    try {
      setError("");
      const [logData, updateData, projectData] = await Promise.all([
        workLogsApi.fetchAll(),
        fetchProjectUpdates().catch(() => []),
        isTeamView ? projectsApi.fetchAll() : fetchMyProjects(),
      ]);
      setWorkLogs(logData);
      setProjectUpdates(updateData);
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

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, date: today() });
    setShowModal(true);
  }

  function openEdit(row) {
    if (row.entryType !== "work_log") return;
    const log = row.raw;
    setEditing(log);
    setForm({
      projectId: log.projectId != null ? String(log.projectId) : "",
      date: log.date,
      hoursWorked: String(log.hoursWorked),
      workDescription: log.workDescription,
      progress: log.progress,
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
        setWorkLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await workLogsApi.create({
          ...form,
          projectId: form.projectId || null,
        });
        setWorkLogs((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("onboarding")) {
        const pending = projects.find((p) => p.onboardingRequired);
        navigate(pending ? `/view-projects/${pending.id}` : "/view-projects");
      }
    }
  }

  async function handleDelete(row) {
    if (row.entryType !== "work_log") return;
    if (!window.confirm("Delete this work log?")) return;
    try {
      setError("");
      await workLogsApi.remove(row.sourceId);
      setWorkLogs((prev) => prev.filter((l) => l.id !== row.sourceId));
    } catch (err) {
      setError(err.message);
    }
  }

  function clearFilters() {
    setFilterProject("");
    setFilterEmployee("");
    setFilterDate("");
  }

  const pendingOnboarding = projects.filter((p) => p.onboardingRequired);
  const hasFilters = Boolean(filterProject || filterEmployee || filterDate);

  const subtitle = isTeamView
    ? "View daily logs, project tasks, and discussions — filter by project and date"
    : "Your daily logs, project tasks, and discussions in one place";

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
          {pendingOnboarding.map((p, index) => (
            <span key={p.id}>
              {index > 0 ? ", " : ""}
              <Link to={`/view-projects/${p.id}`}>{p.name}</Link>
            </span>
          ))}
          .
        </div>
      )}
      {error && <div className="alert error">{error}</div>}

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
        {isTeamView && (
          <label>
            Employee
            <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">All employees</option>
              {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Date
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </label>
        {hasFilters && (
          <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}
        <div className="work-log-summary">
          <span>{displayedItems.length} entries</span>
          <span>{entryCounts.work_log} logs</span>
          <span>{entryCounts.task} tasks</span>
          <span>{entryCounts.discussion} discussions</span>
          <span>{totalHours}h logged</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={displayedItems}
          onEdit={openEdit}
          onDelete={(id) => {
            const row = displayedItems.find((item) => item.id === id);
            if (row) handleDelete(row);
          }}
          canEdit={perms.edit}
          canEditRow={(row) => row.entryType === "work_log" && (isTeamView ? isOwnLog(row.raw, user) : true)}
          canDelete={isTeamView || perms.delete}
          canDeleteRow={(row) =>
            row.entryType === "work_log" && (isTeamView || perms.delete || isOwnLog(row.raw, user))
          }
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
