import { useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronDown, ChevronUp, ExternalLink, ListTodo } from "lucide-react";
import { fetchProjectUpdates, projectUpdatesApi, projectsApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import PageHeader from "../components/PageHeader";

const STATUS_DAYS = 4;
const TASK_STATUS_OPTIONS = ["New", "Completed", "Carry forward"];

const today = () => new Date().toISOString().slice(0, 10);

function getLastNDays(n = STATUS_DAYS) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function taskStatusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function statusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function formatDayHeader(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const isToday = dateStr === today();
  const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return isToday ? `${label} (Today)` : label;
}

function formatFullDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PmProjectBoard() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [addingForProject, setAddingForProject] = useState(null);
  const [taskForms, setTaskForms] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const statusDays = useMemo(() => getLastNDays(STATUS_DAYS), []);
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const owners = useMemo(() => {
    const ownerIds = [...new Set(projects.map((p) => p.ownerId).filter(Boolean))];
    return ownerIds
      .map((id) => ({ id, name: employeeMap[id] || `ID ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, employeeMap]);

  const filteredProjects = useMemo(() => {
    if (ownerFilter === "all") return projects;
    if (ownerFilter === "unassigned") return projects.filter((p) => !p.ownerId);
    return projects.filter((p) => String(p.ownerId) === ownerFilter);
  }, [projects, ownerFilter]);

  const updatesByProject = useMemo(() => {
    const map = new Map();
    updates.forEach((u) => {
      if (!map.has(u.projectId)) map.set(u.projectId, []);
      map.get(u.projectId).push(u);
    });
    return map;
  }, [updates]);

  function getTasksForDate(projectId, date) {
    const projectUpdates = updatesByProject.get(projectId) || [];
    return projectUpdates.filter((u) => u.type === "status" && u.date === date);
  }

  function getAllStatusUpdates(projectId) {
    const projectUpdates = updatesByProject.get(projectId) || [];
    return projectUpdates
      .filter((u) => u.type === "status")
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }

  function groupedByDate(items) {
    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [projectData, employeeData, updateData] = await Promise.all([
        projectsApi.fetchAll(),
        fetchEmployees().catch(() => []),
        fetchProjectUpdates(),
      ]);
      setProjects(projectData);
      setEmployees(employeeData);
      setUpdates(updateData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function getTaskForm(projectId) {
    return taskForms[projectId] || { content: "", taskStatus: "New", date: today() };
  }

  function setTaskForm(projectId, patch) {
    setTaskForms((prev) => ({
      ...prev,
      [projectId]: { ...getTaskForm(projectId), ...patch },
    }));
  }

  function openAddTask(projectId) {
    setAddingForProject(projectId);
    setTaskForm(projectId, { content: "", taskStatus: "New", date: today() });
    setExpandedProjectId(null);
  }

  function closeAddTask() {
    setAddingForProject(null);
  }

  function toggleExpand(projectId) {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
    setAddingForProject(null);
  }

  async function handleAddTask(e, project) {
    e.preventDefault();
    const form = getTaskForm(project.id);
    if (!form.content.trim()) return;

    try {
      setSaving(true);
      setError("");
      const created = await projectUpdatesApi.create({
        projectId: project.id,
        date: form.date,
        type: "status",
        content: form.content.trim(),
        taskStatus: form.taskStatus,
      });
      setUpdates((prev) => [created, ...prev]);
      setTaskForm(project.id, { content: "", taskStatus: "New", date: today() });
      setAddingForProject(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading-state">Loading project status board...</div>;
  }

  return (
    <>
      <PageHeader
        title="Project Status Board"
        subtitle="Manage daily tasks and status for all projects in one place"
      />

      <div className="pm-board-toolbar">
        <div className="pm-board-filters">
          <label>
            Filter by owner
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
              <option value="all">All owners ({projects.length})</option>
              <option value="unassigned">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={String(owner.id)}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span className="pm-board-meta">
          Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} · Last {STATUS_DAYS} days
        </span>
      </div>

      {error && <div className="alert error">{error}</div>}

      {filteredProjects.length === 0 ? (
        <div className="empty-state">No projects match this filter.</div>
      ) : (
        <div className="pm-board-wrap">
          <table className="pm-board-table">
            <thead>
              <tr>
                <th className="pm-col-project">Project</th>
                <th className="pm-col-owner">Owner</th>
                <th className="pm-col-status">Status</th>
                {statusDays.map((day) => (
                  <th key={day} className="pm-col-day">{formatDayHeader(day)}</th>
                ))}
                <th className="pm-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const isExpanded = expandedProjectId === project.id;
                const isAdding = addingForProject === project.id;
                const allStatus = getAllStatusUpdates(project.id);

                return (
                  <Fragment key={project.id}>
                    <tr className={isExpanded || isAdding ? "pm-row-active" : ""}>
                      <td className="pm-col-project">
                        <strong>{project.name}</strong>
                        <span className="pm-board-client">{project.clientName}</span>
                      </td>
                      <td className="pm-col-owner">
                        {project.ownerId ? employeeMap[project.ownerId] || "—" : (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td className="pm-col-status">
                        <span className={`status-pill status-pill--${statusClass(project.status)}`}>
                          {project.status}
                        </span>
                      </td>
                      {statusDays.map((day) => {
                        const tasks = getTasksForDate(project.id, day);
                        return (
                          <td key={day} className="pm-col-day">
                            {tasks.length === 0 ? (
                              <span className="pm-day-empty">—</span>
                            ) : (
                              <ul className="pm-day-tasks">
                                {tasks.map((task) => (
                                  <li key={task.id} className="pm-day-task">
                                    <span className={`badge task-status task-status--${taskStatusClass(task.taskStatus)}`}>
                                      {task.taskStatus}
                                    </span>
                                    <p>{task.content}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        );
                      })}
                      <td className="pm-col-actions">
                        <div className="pm-row-actions">
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => openAddTask(project.id)}
                          >
                            <Plus size={14} /> Add task
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => toggleExpand(project.id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp size={14} /> Hide</>
                            ) : (
                              <><ChevronDown size={14} /> View all</>
                            )}
                          </button>
                          <Link
                            to={`/view-projects/${project.id}`}
                            className="btn-secondary btn-sm pm-link-btn"
                            title="Open full project view"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {isAdding && (
                      <tr className="pm-row-form">
                        <td colSpan={4 + STATUS_DAYS}>
                          <form className="pm-inline-form" onSubmit={(e) => handleAddTask(e, project)}>
                            <h4>
                              <ListTodo size={16} />
                              Add daily task — {project.name}
                            </h4>
                            <div className="pm-inline-form-grid">
                              <label>
                                Date
                                <input
                                  type="date"
                                  value={getTaskForm(project.id).date}
                                  onChange={(e) => setTaskForm(project.id, { date: e.target.value })}
                                  required
                                />
                              </label>
                              <label>
                                Task status
                                <select
                                  value={getTaskForm(project.id).taskStatus}
                                  onChange={(e) => setTaskForm(project.id, { taskStatus: e.target.value })}
                                  required
                                >
                                  {TASK_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="span-full">
                                Task / work description
                                <textarea
                                  rows={2}
                                  value={getTaskForm(project.id).content}
                                  onChange={(e) => setTaskForm(project.id, { content: e.target.value })}
                                  placeholder="What was done today, blockers, next steps..."
                                  required
                                  autoFocus
                                />
                              </label>
                            </div>
                            <div className="form-actions">
                              <button type="button" className="btn-secondary" onClick={closeAddTask}>
                                Cancel
                              </button>
                              <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? "Saving..." : "Save task"}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}

                    {isExpanded && (
                      <tr className="pm-row-detail">
                        <td colSpan={4 + STATUS_DAYS}>
                          <div className="pm-detail-panel">
                            <h4>All daily tasks — {project.name}</h4>
                            {allStatus.length === 0 ? (
                              <p className="muted">No daily tasks recorded yet.</p>
                            ) : (
                              <div className="pm-detail-timeline">
                                {groupedByDate(allStatus).map(([date, items]) => (
                                  <div key={date} className="pm-detail-day">
                                    <h5>{formatFullDate(date)}</h5>
                                    <ul>
                                      {items.map((item) => (
                                        <li key={item.id}>
                                          <span className={`badge task-status task-status--${taskStatusClass(item.taskStatus)}`}>
                                            {item.taskStatus}
                                          </span>
                                          <p>{item.content}</p>
                                          <span className="celebration-meta">
                                            {item.authorName} · {new Date(item.createdAt).toLocaleTimeString("en-US", {
                                              hour: "numeric",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Link to={`/view-projects/${project.id}`} className="panel-link">
                              Open full project view →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
