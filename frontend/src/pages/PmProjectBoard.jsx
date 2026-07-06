import { useEffect, useMemo, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronDown, ChevronUp, ExternalLink, Pencil } from "lucide-react";
import { fetchProjectUpdates, projectUpdatesApi, projectsApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";

const STATUS_DAYS = 4;
const TASK_STATUS_OPTIONS = ["New", "Completed", "Carry forward"];
const PROJECT_STATUS_OPTIONS = ["Planning", "In Progress", "On Hold", "Completed"];
const EMPTY_TASK_FORM = {
  content: "",
  taskStatus: "New",
  date: "",
  dueAt: "",
  overdueNote: "",
};

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

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusUpdatedAt(task) {
  return task.statusUpdatedAt || task.createdAt;
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isTaskOverdue(task) {
  if (!task?.dueAt || task.taskStatus === "Completed") return false;
  return new Date() > new Date(task.dueAt);
}

function sortTasksByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a);
    const bOverdue = isTaskOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (a.dueAt && b.dueAt) return new Date(a.dueAt) - new Date(b.dueAt);
    return 0;
  });
}

function projectHasOverdueTasks(projectId, projectUpdates) {
  return projectUpdates.some(
    (task) => task.type === "status" && task.projectId === projectId && isTaskOverdue(task)
  );
}

function TaskStatusSelect({ task, onChange, disabled }) {
  return (
    <select
      className={`pm-task-status-select task-status--${taskStatusClass(task.taskStatus)}`}
      value={task.taskStatus}
      onChange={(e) => onChange(task, e.target.value)}
      disabled={disabled}
      title="Update task status"
      aria-label={`Task status: ${task.content}`}
    >
      {TASK_STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function ProjectStatusSelect({ project, onChange, disabled }) {
  return (
    <select
      className={`pm-project-status-select status-pill status-pill--${statusClass(project.status)}`}
      value={project.status}
      onChange={(e) => onChange(project, e.target.value)}
      disabled={disabled}
      title="Update project status"
      aria-label={`Project status for ${project.name}`}
    >
      {PROJECT_STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function TaskCard({ task, updatingTaskId, isSelected, onStatusChange, onEdit }) {
  const overdue = isTaskOverdue(task);

  return (
    <div
      className={`pm-day-task ${isSelected ? "pm-day-task--selected" : ""} ${
        overdue ? "pm-day-task--overdue" : ""
      }`}
    >
      <div className="pm-day-task-head">
        <TaskStatusSelect
          task={task}
          onChange={onStatusChange}
          disabled={updatingTaskId === task.id}
        />
        {overdue && <span className="pm-overdue-badge">Overdue</span>}
        <button
          type="button"
          className="icon-action pm-task-edit-btn"
          onClick={() => onEdit(task)}
          title="Edit task"
          aria-label={`Edit task: ${task.content}`}
        >
          <Pencil size={13} />
        </button>
      </div>
      <p>{task.content}</p>
      {task.dueAt && (
        <span className={`pm-task-due ${overdue ? "pm-task-due--overdue" : ""}`}>
          Complete by {formatDateTime(task.dueAt)}
        </span>
      )}
      {task.overdueNote && (
        <p className="pm-task-overdue-note">
          <strong>Reason:</strong> {task.overdueNote}
        </p>
      )}
      <span className="pm-task-status-time">
        Status updated {formatDateTime(getStatusUpdatedAt(task))}
      </span>
    </div>
  );
}

function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getProjectTeam(project, employeeById) {
  return (project.assignedEmployeeIds || [])
    .map((id) => employeeById[id])
    .filter(Boolean);
}

function isCompletedProject(project) {
  return (project.status || "").toLowerCase() === "completed";
}

function getEnvSiteUrl(project, envKey) {
  const raw = (project?.[envKey]?.siteUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function ProjectEnvLinks({ project }) {
  const stagingUrl = getEnvSiteUrl(project, "stagingDetails");
  const liveUrl = getEnvSiteUrl(project, "productionDetails");

  if (!stagingUrl && !liveUrl) return null;

  return (
    <div className="pm-project-env-links">
      {stagingUrl && (
        <a
          href={stagingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-sm pm-env-access-btn"
          title={`Open staging site: ${stagingUrl}`}
        >
          <ExternalLink size={12} />
          Access staging
        </a>
      )}
      {liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-sm pm-env-access-btn"
          title={`Open live site: ${liveUrl}`}
        >
          <ExternalLink size={12} />
          Access live
        </a>
      )}
    </div>
  );
}

export default function PmProjectBoard() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [addingForProject, setAddingForProject] = useState(null);
  const [taskForms, setTaskForms] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOwnerId, setSavingOwnerId] = useState(null);
  const [savingProjectStatusId, setSavingProjectStatusId] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskForms, setEditTaskForms] = useState({});
  const [savingTaskEditId, setSavingTaskEditId] = useState(null);

  const statusDays = useMemo(() => getLastNDays(STATUS_DAYS), []);
  const employeeById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const boardProjects = useMemo(
    () => projects.filter((p) => !isCompletedProject(p)),
    [projects]
  );

  const owners = useMemo(() => {
    const ownerIds = [...new Set(boardProjects.map((p) => p.ownerId).filter(Boolean))];
    return ownerIds
      .map((id) => ({ id, name: employeeMap[id] || `ID ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boardProjects, employeeMap]);

  const teamMembers = useMemo(() => {
    const ids = [...new Set(boardProjects.flatMap((p) => p.assignedEmployeeIds || []))];
    return ids
      .map((id) => employeeById[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boardProjects, employeeById]);

  const filteredProjects = useMemo(() => {
    const list = boardProjects.filter((project) => {
      const ownerMatch =
        ownerFilter === "all" ||
        (ownerFilter === "unassigned" && !project.ownerId) ||
        String(project.ownerId) === ownerFilter;

      const assignedIds = (project.assignedEmployeeIds || []).map(String);
      const teamMatch =
        teamFilter === "all" ||
        (teamFilter === "unassigned" && assignedIds.length === 0) ||
        assignedIds.includes(teamFilter);

      return ownerMatch && teamMatch;
    });

    return list.sort((a, b) => {
      const aOverdue = projectHasOverdueTasks(a.id, updates);
      const bOverdue = projectHasOverdueTasks(b.id, updates);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [boardProjects, ownerFilter, teamFilter, updates]);

  const addingProject = useMemo(
    () => boardProjects.find((p) => p.id === addingForProject) || null,
    [boardProjects, addingForProject]
  );

  const editingTask = useMemo(
    () => (editingTaskId ? updates.find((u) => u.id === editingTaskId) || null : null),
    [editingTaskId, updates]
  );

  const editingProject = useMemo(() => {
    if (!editingTask) return null;
    return boardProjects.find((p) => p.id === editingTask.projectId) || projects.find((p) => p.id === editingTask.projectId) || null;
  }, [editingTask, boardProjects, projects]);

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
    return sortTasksByPriority(
      projectUpdates.filter((u) => u.type === "status" && u.date === date)
    );
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
    return {
      ...EMPTY_TASK_FORM,
      date: today(),
      ...(taskForms[projectId] || {}),
    };
  }

  function setTaskForm(projectId, patch) {
    setTaskForms((prev) => ({
      ...prev,
      [projectId]: { ...getTaskForm(projectId), ...patch },
    }));
  }

  function openAddTask(projectId) {
    setAddingForProject(projectId);
    setTaskForm(projectId, { ...EMPTY_TASK_FORM, date: today() });
    setEditingTaskId(null);
  }

  function closeAddTask() {
    setAddingForProject(null);
  }

  function toggleExpand(projectId) {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
    setAddingForProject(null);
    setEditingTaskId(null);
  }

  async function handleOwnerChange(project, ownerId) {
    const nextOwnerId = ownerId ? Number(ownerId) : null;
    if (project.ownerId === nextOwnerId) return;

    try {
      setSavingOwnerId(project.id);
      setError("");
      const updated = await projectsApi.update(project.id, { ownerId: nextOwnerId });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingOwnerId(null);
    }
  }

  async function handleProjectStatusChange(project, nextStatus) {
    if (project.status === nextStatus) return;

    try {
      setSavingProjectStatusId(project.id);
      setError("");
      const updated = await projectsApi.update(project.id, { status: nextStatus });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProjectStatusId(null);
    }
  }

  function getEditTaskForm(taskId) {
    return { ...EMPTY_TASK_FORM, date: today(), ...(editTaskForms[taskId] || {}) };
  }

  function setEditTaskForm(taskId, patch) {
    setEditTaskForms((prev) => ({
      ...prev,
      [taskId]: { ...getEditTaskForm(taskId), ...patch },
    }));
  }

  function openEditTask(task) {
    setEditingTaskId(task.id);
    setEditTaskForm(task.id, {
      content: task.content,
      taskStatus: task.taskStatus || "New",
      date: task.date,
      dueAt: toDatetimeLocal(task.dueAt),
      overdueNote: task.overdueNote || "",
    });
    setAddingForProject(null);
  }

  function closeEditTask() {
    setEditingTaskId(null);
  }

  async function handleSaveTaskEdit(task) {
    const form = getEditTaskForm(task.id);
    if (!form.content.trim()) return;

    try {
      setSavingTaskEditId(task.id);
      setError("");
      const updated = await projectUpdatesApi.update(task.id, {
        date: form.date,
        type: "status",
        content: form.content.trim(),
        taskStatus: form.taskStatus,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        overdueNote: form.overdueNote.trim() || null,
      });
      setUpdates((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingTaskId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTaskEditId(null);
    }
  }

  async function handleTaskStatusUpdate(task, nextStatus) {
    if (task.taskStatus === nextStatus) return;

    try {
      setUpdatingTaskId(task.id);
      setError("");
      const updated = await projectUpdatesApi.update(task.id, { taskStatus: nextStatus });
      setUpdates((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingTaskId(null);
    }
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
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        overdueNote: form.overdueNote.trim() || null,
      });
      setUpdates((prev) => [created, ...prev]);
      setTaskForm(project.id, { ...EMPTY_TASK_FORM, date: today() });
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
          <label className="pm-field pm-field--filter">
            <span className="pm-field__label">Filter by owner</span>
            <select
              className="pm-field__control pm-field__control--select"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="all">All owners</option>
              <option value="unassigned">Unassigned owner</option>
              {owners.map((owner) => (
                <option key={owner.id} value={String(owner.id)}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="pm-field pm-field--filter">
            <span className="pm-field__label">Filter by team member</span>
            <select
              className="pm-field__control pm-field__control--select"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All team members</option>
              <option value="unassigned">No team assigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name} — {member.position}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span className="pm-board-meta">
          Showing {filteredProjects.length} of {boardProjects.length} active project{boardProjects.length !== 1 ? "s" : ""} · Last {STATUS_DAYS} days
        </span>
      </div>

      {error && <div className="alert error">{error}</div>}

      {addingProject && (
        <Modal
          title={`Add daily task — ${addingProject.name}`}
          onClose={closeAddTask}
          size="wide"
        >
          <form className="pm-task-form pm-task-form--modal" onSubmit={(e) => handleAddTask(e, addingProject)}>
            {addingProject.clientName && (
              <p className="pm-task-modal-subtitle muted">{addingProject.clientName}</p>
            )}
            <div className="pm-task-form-fields">
              <label className="pm-field">
                <span className="pm-field__label">Date</span>
                <input
                  type="date"
                  className="pm-field__control pm-field__control--date"
                  value={getTaskForm(addingProject.id).date}
                  onChange={(e) => setTaskForm(addingProject.id, { date: e.target.value })}
                  required
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">Task status</span>
                <select
                  className="pm-field__control pm-field__control--select"
                  value={getTaskForm(addingProject.id).taskStatus}
                  onChange={(e) => setTaskForm(addingProject.id, { taskStatus: e.target.value })}
                  required
                >
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="pm-field">
                <span className="pm-field__label">Complete by</span>
                <input
                  type="datetime-local"
                  className="pm-field__control pm-field__control--date"
                  value={getTaskForm(addingProject.id).dueAt}
                  onChange={(e) => setTaskForm(addingProject.id, { dueAt: e.target.value })}
                />
              </label>
              <label className="pm-field pm-field--grow">
                <span className="pm-field__label">Task / work description</span>
                <textarea
                  className="pm-field__control pm-field__control--textarea"
                  rows={5}
                  value={getTaskForm(addingProject.id).content}
                  onChange={(e) => setTaskForm(addingProject.id, { content: e.target.value })}
                  placeholder="What was done today, blockers, next steps..."
                  required
                  autoFocus
                />
              </label>
              <label className="pm-field pm-field--grow">
                <span className="pm-field__label">Reason / notes</span>
                <textarea
                  className="pm-field__control pm-field__control--textarea"
                  rows={2}
                  value={getTaskForm(addingProject.id).overdueNote}
                  onChange={(e) => setTaskForm(addingProject.id, { overdueNote: e.target.value })}
                  placeholder="Why this is priority, blocker, or overdue context..."
                />
              </label>
            </div>
            <div className="pm-task-form-footer">
              <button type="button" className="btn-secondary" onClick={closeAddTask}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Plus size={16} />
                {saving ? "Saving..." : "Save task"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingTask && (
        <Modal
          title={`Edit daily task — ${editingProject?.name || editingTask.projectName || "Project"}`}
          onClose={closeEditTask}
          size="wide"
        >
          <form
            className="pm-task-form pm-task-form--modal"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveTaskEdit(editingTask);
            }}
          >
            <p className="pm-task-modal-subtitle muted">
              {editingProject?.clientName ? `${editingProject.clientName} · ` : ""}
              {formatFullDate(getEditTaskForm(editingTask.id).date)}
            </p>
            <div className="pm-task-form-fields">
              <label className="pm-field">
                <span className="pm-field__label">Date</span>
                <input
                  type="date"
                  className="pm-field__control pm-field__control--date"
                  value={getEditTaskForm(editingTask.id).date}
                  onChange={(e) => setEditTaskForm(editingTask.id, { date: e.target.value })}
                  required
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">Task status</span>
                <select
                  className="pm-field__control pm-field__control--select"
                  value={getEditTaskForm(editingTask.id).taskStatus}
                  onChange={(e) => setEditTaskForm(editingTask.id, { taskStatus: e.target.value })}
                  required
                >
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="pm-field">
                <span className="pm-field__label">Complete by</span>
                <input
                  type="datetime-local"
                  className="pm-field__control pm-field__control--date"
                  value={getEditTaskForm(editingTask.id).dueAt}
                  onChange={(e) => setEditTaskForm(editingTask.id, { dueAt: e.target.value })}
                />
              </label>
              <label className="pm-field pm-field--grow">
                <span className="pm-field__label">Task / work description</span>
                <textarea
                  className="pm-field__control pm-field__control--textarea"
                  rows={5}
                  value={getEditTaskForm(editingTask.id).content}
                  onChange={(e) => setEditTaskForm(editingTask.id, { content: e.target.value })}
                  placeholder="What was done, blockers, next steps..."
                  required
                  autoFocus
                />
              </label>
              <label className="pm-field pm-field--grow">
                <span className="pm-field__label">Reason / notes</span>
                <textarea
                  className="pm-field__control pm-field__control--textarea"
                  rows={2}
                  value={getEditTaskForm(editingTask.id).overdueNote}
                  onChange={(e) => setEditTaskForm(editingTask.id, { overdueNote: e.target.value })}
                  placeholder="Why this is priority, blocker, or overdue context..."
                />
              </label>
            </div>
            <div className="pm-task-form-footer">
              <button type="button" className="btn-secondary" onClick={closeEditTask}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={savingTaskEditId === editingTask.id}>
                {savingTaskEditId === editingTask.id ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {filteredProjects.length === 0 ? (
        <div className="empty-state">No projects match this filter.</div>
      ) : (
        <div className="pm-board-wrap">
          <table className="pm-board-table">
            <thead>
              <tr>
                <th className="pm-col-project">Project</th>
                <th className="pm-col-owner">Owner</th>
                <th className="pm-col-team">Team</th>
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
                const allStatus = getAllStatusUpdates(project.id);
                const team = getProjectTeam(project, employeeById);

                const hasOverdue = projectHasOverdueTasks(project.id, updates);

                return (
                  <Fragment key={project.id}>
                    <tr
                      className={`${isExpanded ? "pm-row-active" : ""} ${
                        hasOverdue ? "pm-row-overdue" : ""
                      }`}
                    >
                      <td className="pm-col-project">
                        <strong>{project.name}</strong>
                        {hasOverdue && <span className="pm-project-overdue-flag">Priority</span>}
                        {project.clientName ? (
                          <span className="pm-board-client">{project.clientName}</span>
                        ) : null}
                        <ProjectEnvLinks project={project} />
                      </td>
                      <td className="pm-col-owner">
                        <label className="pm-owner-select">
                          <span className="sr-only">Assign owner for {project.name}</span>
                          <select
                            value={project.ownerId ? String(project.ownerId) : ""}
                            onChange={(e) => handleOwnerChange(project, e.target.value)}
                            disabled={savingOwnerId === project.id}
                            className={`pm-field__control pm-field__control--select pm-field__control--compact ${!project.ownerId ? "pm-field__control--placeholder" : ""}`}
                          >
                            <option value="">Assign owner…</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="pm-col-team">
                        {team.length === 0 ? (
                          <span className="muted pm-team-empty">No team assigned</span>
                        ) : (
                          <ul className="pm-team-chips">
                            {team.map((member) => (
                              <li
                                key={member.id}
                                className={`pm-team-chip ${teamFilter === String(member.id) ? "pm-team-chip--active" : ""}`}
                                title={[member.position, member.email?.trim()].filter(Boolean).join(" · ")}
                              >
                                <span className="pm-team-avatar">{initials(member.name)}</span>
                                <span className="pm-team-chip-text">
                                  <strong>{member.name}</strong>
                                  <span>{member.position || member.department || "—"}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="pm-col-status">
                        <ProjectStatusSelect
                          project={project}
                          onChange={handleProjectStatusChange}
                          disabled={savingProjectStatusId === project.id}
                        />
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
                                  <TaskCard
                                    key={task.id}
                                    task={task}
                                    updatingTaskId={updatingTaskId}
                                    isSelected={editingTaskId === task.id}
                                    onStatusChange={handleTaskStatusUpdate}
                                    onEdit={openEditTask}
                                  />
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
                            className={`btn-secondary btn-sm ${addingForProject === project.id ? "active" : ""}`}
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

                    {isExpanded && (
                      <tr className="pm-row-detail">
                        <td colSpan={5 + STATUS_DAYS}>
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
                                      {sortTasksByPriority(items).map((item) => (
                                        <li key={item.id}>
                                          <TaskCard
                                            task={item}
                                            updatingTaskId={updatingTaskId}
                                            isSelected={editingTaskId === item.id}
                                            onStatusChange={handleTaskStatusUpdate}
                                            onEdit={openEditTask}
                                          />
                                          <span className="celebration-meta">
                                            {item.authorName} · added{" "}
                                            {new Date(item.createdAt).toLocaleTimeString("en-US", {
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
