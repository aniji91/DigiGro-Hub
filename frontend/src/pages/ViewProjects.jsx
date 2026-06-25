import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageSquareText, Activity, Plus, Pencil, Trash2, ArrowLeft, Calendar, Users, Building2, LayoutGrid } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchMyProjects, fetchProjectUpdates, projectUpdatesApi, projectsApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import { PROJECT_TYPE_LABELS } from "../config/projectConfig";
import { ProjectBriefDetails } from "../components/ProjectBriefDetails";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_POINT = {
  date: today(),
  type: "discussion",
  content: "",
};

const TYPE_LABELS = {
  discussion: "Discussion Point",
  status: "Status Point",
};

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedId = projectId ? Number(projectId) : null;
  const selectedProject = projects.find((p) => p.id === selectedId) || null;
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const filteredUpdates = useMemo(() => {
    if (filterType === "all") return updates;
    return updates.filter((u) => u.type === filterType);
  }, [updates, filterType]);

  const discussionCount = updates.filter((u) => u.type === "discussion").length;
  const statusCount = updates.filter((u) => u.type === "status").length;
  const teamIds = selectedProject?.assignedEmployeeIds || [];

  const groupedUpdates = useMemo(() => {
    const groups = new Map();
    filteredUpdates.forEach((item) => {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredUpdates]);

  function teamMemberLabel(id) {
    const name = employeeMap[id];
    if (!name) return null;
    return name;
  }

  function initials(name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
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
    setForm({ ...EMPTY_POINT, date: today() });
  }, [selectedId]);

  function selectProject(id) {
    navigate(`/view-projects/${id}`);
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...EMPTY_POINT, date: today() });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProject || !form.content.trim()) return;

    try {
      setSaving(true);
      setError("");
      if (editing) {
        const updated = await projectUpdatesApi.update(editing.id, form);
        setUpdates((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await projectUpdatesApi.create({
          ...form,
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

  function startEdit(item) {
    setEditing(item);
    setForm({
      date: item.date,
      type: item.type,
      content: item.content,
    });
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

  if (projects.length === 0) {
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
            <span className="project-view-list-count">{projects.length} total</span>
          </header>
          <ul className="project-view-grid">
            {projects.map((project) => (
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
              <div className="project-view-hero-main">
                <div className="project-view-hero-nav">
                  <button
                    type="button"
                    className="project-view-back project-view-back--btn"
                    onClick={() => navigate("/view-projects")}
                  >
                    <LayoutGrid size={16} /> All projects
                  </button>
                  <Link
                    to={user?.role === "employee" ? "/my-projects" : "/projects"}
                    className="project-view-back"
                  >
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

              <div className="project-view-hero-aside">
                <div className="project-view-stat-cards">
                  <div className="project-view-stat">
                    <MessageSquareText size={18} />
                    <div>
                      <strong>{discussionCount}</strong>
                      <span>Discussions</span>
                    </div>
                  </div>
                  <div className="project-view-stat">
                    <Activity size={18} />
                    <div>
                      <strong>{statusCount}</strong>
                      <span>Status points</span>
                    </div>
                  </div>
                </div>

                <div className="project-view-team-block">
                  <span className="field-label"><Users size={14} /> Team</span>
                  <div className="project-view-team-avatars">
                    {teamIds.filter((id) => teamMemberLabel(id)).length > 0 ? (
                      teamIds
                        .map((id) => ({ id, name: teamMemberLabel(id) }))
                        .filter((member) => member.name)
                        .map((member) => (
                          <span key={member.id} className="team-avatar" title={member.name}>
                            <span className="team-avatar-initials">{initials(member.name)}</span>
                            <span className="team-avatar-name">{member.name}</span>
                          </span>
                        ))
                    ) : (
                      <span className="muted">No members assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <div className="project-view-body">
              <section className="project-view-details-panel">
                <h3>Project details</h3>
                <ProjectBriefDetails project={selectedProject} hideOverview />
              </section>

              <section className="project-view-updates">
                <div className="project-view-updates-header">
                  <div>
                    <h2>Daily updates</h2>
                    <p className="muted">Discussion points and status updates for the team</p>
                  </div>
                  <div className="project-view-filters">
                    <button
                      type="button"
                      className={`filter-chip ${filterType === "all" ? "active" : ""}`}
                      onClick={() => setFilterType("all")}
                    >
                      All ({updates.length})
                    </button>
                    <button
                      type="button"
                      className={`filter-chip ${filterType === "discussion" ? "active" : ""}`}
                      onClick={() => setFilterType("discussion")}
                    >
                      <MessageSquareText size={14} /> Discussion ({discussionCount})
                    </button>
                    <button
                      type="button"
                      className={`filter-chip ${filterType === "status" ? "active" : ""}`}
                      onClick={() => setFilterType("status")}
                    >
                      <Activity size={14} /> Status ({statusCount})
                    </button>
                  </div>
                </div>

                {error && <div className="alert error">{error}</div>}

                <form className="project-point-form" onSubmit={handleSubmit}>
                  <h3>{editing ? "Edit point" : "Add point"}</h3>
                  <div className="project-point-form-grid">
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
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        required
                      >
                        <option value="discussion">Daily discussion point</option>
                        <option value="status">Status point</option>
                      </select>
                    </label>
                    <label className="span-full">
                      {form.type === "discussion" ? "Discussion" : "Status update"}
                      <textarea
                        rows={4}
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder={
                          form.type === "discussion"
                            ? "Topics discussed, decisions, blockers, next steps..."
                            : "Current progress, milestones, risks, delivery status..."
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

                <div className="project-points-feed">
                  {groupedUpdates.length === 0 ? (
                    <div className="empty-state">No discussion or status points yet. Add the first update above.</div>
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
