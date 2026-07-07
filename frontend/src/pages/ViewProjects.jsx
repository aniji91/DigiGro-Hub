import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageSquareText, ListTodo, Plus, Pencil, Trash2, ArrowLeft, Calendar, Users, Building2, LayoutGrid } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchMyProjects, fetchProjectUpdates, projectUpdatesApi, projectsApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import { PROJECT_TYPE_LABELS } from "../config/projectConfig";
import { ProjectBriefDetails } from "../components/ProjectBriefDetails";
import { ProjectEnvironmentDetails } from "../components/ProjectEnvironmentDetails";
import { ProjectExternalCrmDetails } from "../components/ProjectExternalCrmDetails";
import ProjectOnboardingPanel from "../components/ProjectOnboardingPanel";
import { filterActiveProjects } from "../utils/projectVisibility";
import { filterVisibleTasks } from "../utils/taskVisibility";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_POINT = {
  date: today(),
  type: "status",
  content: "",
  taskStatus: "New",
};

const TYPE_LABELS = {
  discussion: "Discussion Point",
  status: "Daily Task",
};

const TASK_STATUS_OPTIONS = ["New", "Completed", "Carry forward"];

function taskStatusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function statusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ViewProjects() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(EMPTY_POINT);
  const [editing, setEditing] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedId = projectId ? Number(projectId) : null;
  const selectedProject = projects.find((p) => p.id === selectedId) || null;
  const visibleProjects = useMemo(() => filterActiveProjects(projects), [projects]);
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const visibleUpdates = useMemo(() => filterVisibleTasks(updates), [updates]);

  const filteredUpdates = useMemo(() => {
    if (filterType === "all") return visibleUpdates;
    return visibleUpdates.filter((u) => u.type === filterType);
  }, [visibleUpdates, filterType]);

  const discussionCount = visibleUpdates.filter((u) => u.type === "discussion").length;
  const taskCount = visibleUpdates.filter((u) => u.type === "status").length;
  const teamIds = selectedProject?.assignedEmployeeIds || [];

  const teamMembers = useMemo(
    () =>
      teamIds
        .map((id) => ({ id, name: employeeMap[id] }))
        .filter((member) => member.name),
    [teamIds, employeeMap]
  );

  const groupedUpdates = useMemo(() => {
    const groups = new Map();
    filteredUpdates.forEach((item) => {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredUpdates]);

  function initials(name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function selectFilter(nextFilter) {
    setFilterType(nextFilter);
    if (editing) return;

    if (nextFilter === "discussion") {
      setForm((prev) => ({ ...prev, type: "discussion" }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      type: "status",
      taskStatus: prev.taskStatus || "New",
    }));
  }

  function handleProjectSaved(updated) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  function handleOnboardingUpdate(updated) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updated.projectId
          ? { ...p, onboarding: updated, onboardingRequired: updated.status !== "completed" }
          : p
      )
    );
  }

  async function loadProjects() {
    const isEmployee = user?.role === "employee";
    const [projectData, employeeData] = await Promise.all([
      isEmployee ? fetchMyProjects() : projectsApi.fetchAll(),
      fetchEmployees().catch(() => []),
    ]);
    setProjects(projectData);
    setEmployees(employeeData);
    return projectData;
  }

  async function loadUpdates(id) {
    if (!id) {
      setUpdates([]);
      return;
    }
    const data = await fetchProjectUpdates(id);
    setUpdates(data);
  }

  useEffect(() => {
    async function init() {
      try {
        setError("");
        setLoading(true);
        const projectData = await loadProjects();
        if (projectId && !projectData.some((p) => p.id === Number(projectId)) && projectData[0]?.id) {
          navigate(`/view-projects/${projectData[0].id}`, { replace: true });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user?.role]);

  useEffect(() => {
    if (!selectedId) return;
    loadUpdates(selectedId).catch((err) => setError(err.message));
    setEditing(null);
    setShowAddForm(false);
    setForm({ ...EMPTY_POINT, date: today() });
  }, [selectedId]);

  function selectProject(id) {
    navigate(`/view-projects/${id}`);
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...EMPTY_POINT, date: today() });
    setShowAddForm(false);
  }

  function openAddForm(type = form.type) {
    setEditing(null);
    setForm({
      ...EMPTY_POINT,
      date: today(),
      type: type === "discussion" ? "discussion" : "status",
      taskStatus: "New",
    });
    setShowAddForm(true);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({
      date: item.date,
      type: item.type,
      content: item.content,
      taskStatus: item.taskStatus || "New",
    });
    setShowAddForm(true);
  }

  function buildPayload() {
    const payload = {
      date: form.date,
      type: form.type,
      content: form.content,
    };
    if (form.type === "status") {
      payload.taskStatus = form.taskStatus;
    }
    return payload;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProject || !form.content.trim()) return;
    if (form.type === "status" && !form.taskStatus) return;

    try {
      setSaving(true);
      setError("");
      const payload = buildPayload();
      if (editing) {
        const updated = await projectUpdatesApi.update(editing.id, payload);
        setUpdates((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await projectUpdatesApi.create({
          ...payload,
          projectId: selectedProject.id,
        });
        setUpdates((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this point?")) return;
    try {
      await projectUpdatesApi.remove(id);
      setUpdates((prev) => prev.filter((u) => u.id !== id));
      if (editing?.id === id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  function canModify(item) {
    return item.authorId === user?.id || ["superadmin", "admin", "product_manager"].includes(user?.role);
  }

  if (loading) {
    return <div className="project-view-page"><div className="loading-state">Loading projects...</div></div>;
  }

  if (visibleProjects.length === 0) {
    return (
      <div className="project-view-page">
        <div className="empty-state">No projects available to view.</div>
      </div>
    );
  }

  return (
    <div className={`project-view-page ${selectedProject ? "project-view-page--detail" : "project-view-page--list"}`}>
      {!selectedProject ? (
        <main className="project-view-list-page">
          <header className="project-view-list-page-header">
            <div>
              <h1>All projects</h1>
              <p className="muted">Select a project to view details and daily updates</p>
            </div>
            <span className="project-view-list-count">{visibleProjects.length} total</span>
          </header>
          <ul className="project-view-grid">
            {visibleProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="project-view-grid-card"
                  onClick={() => selectProject(project.id)}
                >
                  <div className="project-view-list-item-top">
                    <strong>{project.name}</strong>
                    <span className={`status-pill status-pill--${statusClass(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  {user?.role === "employee" && project.onboardingRequired && (
                    <span className="badge status-pending">Onboarding required</span>
                  )}
                  <span className="project-view-list-client">{project.clientName}</span>
                  <span className="project-view-grid-meta">
                    <Calendar size={14} />
                    {formatDate(project.startDate)} – {formatDate(project.endDate)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </main>
      ) : (
      <main className="project-view-main project-view-main--full">
        {selectedProject ? (
          <>
            <header className="project-view-hero">
              <div className="project-view-hero-top">
                <div className="project-view-hero-main">
                  <div className="project-view-hero-nav">
                    <button
                      type="button"
                      className="project-view-back project-view-back--btn"
                      onClick={() => navigate("/view-projects")}
                    >
                      <LayoutGrid size={16} /> All projects
                    </button>
                    <Link to="/projects" className="project-view-back">
                      <ArrowLeft size={16} /> Back to projects
                    </Link>
                  </div>
                  <div className="project-view-hero-title">
                    <h1>{selectedProject.name}</h1>
                    <span className={`status-pill status-pill--lg status-pill--${statusClass(selectedProject.status)}`}>
                      {selectedProject.status}
                    </span>
                  </div>
                  <div className="project-view-hero-meta">
                    <span><Building2 size={15} /> {selectedProject.clientName}</span>
                    {selectedProject.projectType && (
                      <span>{PROJECT_TYPE_LABELS[selectedProject.projectType] || selectedProject.projectType}</span>
                    )}
                    <span><Calendar size={15} /> {formatDate(selectedProject.startDate)} – {formatDate(selectedProject.endDate)}</span>
                  </div>
                </div>

                <div className="project-view-stat-cards">
                  <div className="project-view-stat">
                    <ListTodo size={18} />
                    <div>
                      <strong>{taskCount}</strong>
                      <span>Daily tasks</span>
                    </div>
                  </div>
                  <div className="project-view-stat">
                    <MessageSquareText size={18} />
                    <div>
                      <strong>{discussionCount}</strong>
                      <span>Discussions</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="project-view-hero-team">
                <span className="project-view-team-label">
                  <Users size={14} />
                  Team
                  {teamMembers.length > 0 && (
                    <span className="project-view-team-count">{teamMembers.length}</span>
                  )}
                </span>
                {teamMembers.length > 0 ? (
                  <div className="project-view-team-chips">
                    {teamMembers.map((member) => (
                      <span key={member.id} className="team-chip" title={member.name}>
                        <span className="team-chip-initials">{initials(member.name)}</span>
                        <span className="team-chip-name">{member.name}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="muted project-view-team-empty">No members assigned</span>
                )}
              </div>
            </header>

            {user?.role === "employee" && selectedProject.onboarding && (
              <ProjectOnboardingPanel
                onboarding={selectedProject.onboarding}
                project={selectedProject}
                onUpdate={handleOnboardingUpdate}
              />
            )}

            <div className="project-view-body">
              <aside className="project-view-side">
                <details className="project-view-details-collapsible">
                  <summary>Project details</summary>
                  <ProjectBriefDetails project={selectedProject} hideOverview />
                </details>

                <details className="project-view-details-collapsible">
                  <summary>Staging &amp; production</summary>
                  <ProjectEnvironmentDetails
                    project={selectedProject}
                    onSaved={handleProjectSaved}
                    compact
                  />
                </details>

                <details className="project-view-details-collapsible">
                  <summary>External CRMs</summary>
                  <ProjectExternalCrmDetails
                    project={selectedProject}
                    onSaved={handleProjectSaved}
                    compact
                  />
                </details>
              </aside>

              <section className="project-view-updates">
                <div className="project-view-updates-toolbar">
                  <h2>Daily tasks &amp; discussions</h2>
                  <div className="project-view-updates-actions">
                    <div className="project-view-filters">
                      <button
                        type="button"
                        className={`filter-chip ${filterType === "all" ? "active" : ""}`}
                        onClick={() => selectFilter("all")}
                      >
                        All ({updates.length})
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${filterType === "status" ? "active" : ""}`}
                        onClick={() => selectFilter("status")}
                      >
                        <ListTodo size={14} /> Tasks ({taskCount})
                      </button>
                      <button
                        type="button"
                        className={`filter-chip ${filterType === "discussion" ? "active" : ""}`}
                        onClick={() => selectFilter("discussion")}
                      >
                        <MessageSquareText size={14} /> Discussion ({discussionCount})
                      </button>
                    </div>
                    {!showAddForm && (
                      <button
                        type="button"
                        className="btn-primary project-view-add-btn"
                        onClick={() => openAddForm(filterType === "discussion" ? "discussion" : "status")}
                      >
                        <Plus size={16} />
                        {filterType === "discussion" ? "Add discussion" : "Add task"}
                      </button>
                    )}
                  </div>
                </div>

                {error && <div className="alert error">{error}</div>}

                {showAddForm && (
                <form className="project-point-form project-point-form--compact" onSubmit={handleSubmit}>
                  <div className="project-point-form-head">
                    <h3>{editing ? "Edit point" : "Add point"}</h3>
                    {!editing && (
                      <button type="button" className="btn-secondary btn-sm" onClick={resetForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="project-point-form-grid project-point-form-grid--compact">
                    <label>
                      Date
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={form.type}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setForm({
                            ...form,
                            type: nextType,
                            taskStatus: nextType === "status" ? form.taskStatus || "New" : "New",
                          });
                          if (!editing) {
                            setFilterType(nextType);
                          }
                        }}
                        required
                      >
                        <option value="status">Daily task</option>
                        <option value="discussion">Daily discussion point</option>
                      </select>
                    </label>
                    {form.type === "status" && (
                      <label>
                        Status
                        <select
                          value={form.taskStatus}
                          onChange={(e) => setForm({ ...form, taskStatus: e.target.value })}
                          required
                        >
                          {TASK_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="span-full">
                      {form.type === "discussion" ? "Discussion" : "Task description"}
                      <textarea
                        rows={2}
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder={
                          form.type === "discussion"
                            ? "Topics discussed, decisions, blockers, next steps..."
                            : "Describe the task, progress, blockers, or next steps..."
                        }
                        required
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    {editing && (
                      <button type="button" className="btn-secondary" onClick={resetForm}>
                        Cancel edit
                      </button>
                    )}
                    <button type="submit" className="btn-primary" disabled={saving}>
                      <Plus size={16} />
                      {saving ? "Saving..." : editing ? "Save changes" : "Add point"}
                    </button>
                  </div>
                </form>
                )}

                <div className="project-points-feed">
                  {groupedUpdates.length === 0 ? (
                    <div className="empty-state">No discussion points or daily tasks yet. Add the first entry above.</div>
                  ) : (
                    groupedUpdates.map(([date, items]) => (
                      <div key={date} className="project-points-day">
                        <h4>{new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}</h4>
                        <div className="project-points-list">
                          {items.map((item) => (
                            <article key={item.id} className={`project-point-card ${item.type}`}>
                              <div className="project-point-card-head">
                                <span className={`badge point-type-${item.type}`}>
                                  {TYPE_LABELS[item.type]}
                                </span>
                                {item.type === "status" && (
                                  <span className={`badge task-status task-status--${taskStatusClass(item.taskStatus || "New")}`}>
                                    {item.taskStatus || "New"}
                                  </span>
                                )}
                                <span className="celebration-meta">
                                  {item.authorName} · {new Date(item.createdAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {canModify(item) && (
                                  <div className="table-actions">
                                    <button type="button" className="icon-action edit" onClick={() => startEdit(item)} title="Edit">
                                      <Pencil size={15} />
                                    </button>
                                    <button type="button" className="icon-action delete" onClick={() => handleDelete(item.id)} title="Delete">
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p>{item.content}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </main>
      )}
    </div>
  );
}
