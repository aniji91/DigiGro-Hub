import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Paperclip, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { projectsApi, clientsApi, fetchProjectTeamOnboarding } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import {
  EMPTY_PROJECT,
  EMPTY_REFERENCE_SITE,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
} from "../config/projectConfig";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { ProjectBriefDetails } from "../components/ProjectBriefDetails";
import { ExternalCrmIntegrationsEditor } from "../components/ExternalCrmIntegrationsEditor";

const MAX_DOC_SIZE = 5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function Projects() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const perms = permissions.projects || {};

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [teamOnboarding, setTeamOnboarding] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);
  const fileInputRef = useRef(null);

  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const columns = [
    { key: "name", label: "Project" },
    { key: "clientName", label: "Client" },
    {
      key: "projectType",
      label: "Type",
      render: (v) => <span className="badge">{PROJECT_TYPE_LABELS[v] || v || "—"}</span>,
    },
    { key: "status", label: "Status", render: (v) => <span className="badge">{v}</span> },
    { key: "startDate", label: "Start" },
    { key: "endDate", label: "End" },
    {
      key: "assignedEmployeeIds",
      label: "Team",
      render: (ids) =>
        (ids || []).map((id) => employeeMap[id] || `ID ${id}`).join(", ") || "—",
    },
    {
      key: "ownerId",
      label: "Owner",
      render: (id) => employeeMap[id] || "—",
    },
  ];

  async function load() {
    try {
      setError("");
      const [projectData, employeeData, clientData] = await Promise.all([
        projectsApi.fetchAll(),
        fetchEmployees(),
        clientsApi.fetchAll().catch(() => []),
      ]);
      setProjects(projectData);
      setEmployees(employeeData);
      setClients(clientData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!viewing) {
      setTeamOnboarding(null);
      return;
    }
    fetchProjectTeamOnboarding(viewing.id)
      .then(setTeamOnboarding)
      .catch(() => setTeamOnboarding(null));
  }, [viewing]);

  function resolveClientId(clientName) {
    const match = clients.find((c) => c.company === clientName || c.name === clientName);
    return match ? String(match.id) : "";
  }

  function mapRowToForm(row) {
    return {
      name: row.name || "",
      clientId: row.clientId ? String(row.clientId) : resolveClientId(row.clientName),
      clientName: row.clientName || "",
      description: row.description || "",
      status: row.status || "Planning",
      startDate: row.startDate || "",
      endDate: row.endDate || "",
      assignedEmployeeIds: row.assignedEmployeeIds || [],
      ownerId: row.ownerId ? String(row.ownerId) : "",
      projectType: row.projectType || "website_creation",
      existingSiteUrl: row.existingSiteUrl || "",
      referenceSites:
        row.referenceSites?.length > 0
          ? row.referenceSites.map((s) => ({ ...EMPTY_REFERENCE_SITE, ...s }))
          : [{ ...EMPTY_REFERENCE_SITE }],
      suggestions: row.suggestions || "",
      targetAudience: row.targetAudience || "",
      pageScope: row.pageScope || "",
      techPreferences: row.techPreferences || "",
      documents: row.documents || [],
      externalCrmIntegrations: row.externalCrmIntegrations || [],
    };
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_PROJECT, referenceSites: [{ ...EMPTY_REFERENCE_SITE }] });
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(mapRowToForm(row));
    setShowModal(true);
  }

  function handleClientChange(e) {
    const clientId = e.target.value;
    const client = clients.find((c) => c.id === Number(clientId));
    setForm((prev) => ({
      ...prev,
      clientId,
      clientName: client ? client.company || client.name : "",
    }));
  }

  function toggleEmployee(id) {
    setForm((prev) => {
      const ids = prev.assignedEmployeeIds || [];
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      return { ...prev, assignedEmployeeIds: next };
    });
  }

  function updateReferenceSite(index, field, value) {
    setForm((prev) => ({
      ...prev,
      referenceSites: prev.referenceSites.map((site, i) =>
        i === index ? { ...site, [field]: value } : site
      ),
    }));
  }

  function addReferenceSite() {
    setForm((prev) => ({
      ...prev,
      referenceSites: [...prev.referenceSites, { ...EMPTY_REFERENCE_SITE }],
    }));
  }

  function removeReferenceSite(index) {
    setForm((prev) => ({
      ...prev,
      referenceSites: prev.referenceSites.filter((_, i) => i !== index),
    }));
  }

  async function handleFiles(files) {
    if (!files?.length) return;
    setDocLoading(true);
    try {
      const loaded = [];
      for (const file of [...files]) {
        if (file.size > MAX_DOC_SIZE) {
          window.alert(`${file.name} is too large (max 5MB)`);
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        loaded.push({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
          uploadedAt: new Date().toISOString(),
        });
      }
      if (loaded.length > 0) {
        setForm((prev) => ({ ...prev, documents: [...prev.documents, ...loaded] }));
      }
    } catch (err) {
      setError(err.message || "Failed to upload document");
    } finally {
      setDocLoading(false);
    }
  }

  function removeDocument(index) {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.clientName) {
      setError("Please select a client");
      return;
    }
    try {
      setError("");
      const payload = {
        ...form,
        clientId: form.clientId ? Number(form.clientId) : undefined,
        assignedEmployeeIds: form.assignedEmployeeIds.map(Number),
        ownerId: form.ownerId ? Number(form.ownerId) : null,
        referenceSites: form.referenceSites.filter((s) => s.url.trim()),
      };
      if (editing) {
        const updated = await projectsApi.update(editing.id, payload);
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await projectsApi.create(payload);
        setProjects((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this project?")) return;
    try {
      await projectsApi.remove(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function getAssignedNames(ids = []) {
    return ids.map((id) => employeeMap[id]).filter(Boolean);
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Create website projects with briefs, references, and team assignments"
        actionLabel="New Project"
        onAction={openCreate}
        showAction={perms.create}
      />
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={projects}
          onView={(row) => navigate(`/view-projects/${row.id}`)}
          onEdit={openEdit}
          onDelete={handleDelete}
          canView={perms.view}
          canEdit={perms.edit}
          canDelete={perms.delete}
        />
      )}

      {viewing && (
        <Modal title="Project Details" onClose={() => setViewing(null)} size="xl">
          <ProjectBriefDetails project={viewing} />
          <div className="view-row" style={{ marginTop: "1rem" }}>
            <span>Assigned Team</span>
            <div className="view-team-list">
              {getAssignedNames(viewing.assignedEmployeeIds).length > 0 ? (
                getAssignedNames(viewing.assignedEmployeeIds).map((name) => (
                  <span key={name} className="badge">{name}</span>
                ))
              ) : (
                <strong>—</strong>
              )}
            </div>
          </div>
          {teamOnboarding?.team?.length > 0 && (
            <div className="onboarding-team-panel">
              <h4>Team onboarding progress</h4>
              <ul className="onboarding-team-list">
                {teamOnboarding.team.map((record) => (
                  <li key={record.id}>
                    <span>{record.employeeName}</span>
                    <span className="onboarding-team-progress">
                      {record.completedSteps}/{record.totalSteps}
                    </span>
                    <span className={`badge ${record.status === "completed" ? "status-approved" : "status-pending"}`}>
                      {record.status === "completed" ? "Complete" : "Required"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
            {perms.edit && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const row = viewing;
                  setViewing(null);
                  openEdit(row);
                }}
              >
                Edit Project
              </button>
            )}
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit Project" : "New Project"}
          onClose={() => setShowModal(false)}
          size="xl"
        >
          <form className="modal-form-layout employee-form project-form" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <div className="employee-form-section">
                <h4>Project overview</h4>
                <div className="employee-form-grid">
                  <label>
                    Project name
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </label>
                  <label>
                    Client
                    <select value={form.clientId} onChange={handleClientChange} required>
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company} — {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Project type
                    <select
                      value={form.projectType}
                      onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                    >
                      {PROJECT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option>Planning</option>
                      <option>In Progress</option>
                      <option>On Hold</option>
                      <option>Completed</option>
                    </select>
                  </label>
                  <label>
                    Start date
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    End date <span className="optional-mark">(optional)</span>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Project owner
                    <select
                      value={form.ownerId}
                      onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                    >
                      <option value="">Select owner</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.position}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="full-width-field">
                  Description
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief summary of the project goals"
                  />
                </label>
              </div>

              <div className="employee-form-section">
                <h4>Website creation brief</h4>
                <div className="employee-form-grid">
                  <label className="full-width-field span-2">
                    Existing website URL <span className="optional-mark">(if available)</span>
                    <input
                      type="url"
                      value={form.existingSiteUrl}
                      onChange={(e) => setForm({ ...form, existingSiteUrl: e.target.value })}
                      placeholder="https://client-current-site.com"
                    />
                  </label>
                  <label>
                    Target audience
                    <input
                      value={form.targetAudience}
                      onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                      placeholder="e.g. B2B SaaS buyers"
                    />
                  </label>
                  <label>
                    Pages / scope
                    <input
                      value={form.pageScope}
                      onChange={(e) => setForm({ ...form, pageScope: e.target.value })}
                      placeholder="e.g. Home, About, Services, Contact"
                    />
                  </label>
                  <label className="full-width-field span-2">
                    Technology / platform preferences
                    <input
                      value={form.techPreferences}
                      onChange={(e) => setForm({ ...form, techPreferences: e.target.value })}
                      placeholder="e.g. WordPress, React, Shopify"
                    />
                  </label>
                </div>

                <div className="reference-sites-block">
                  <div className="employee-section-header">
                    <span className="field-label">Reference sites</span>
                    <button type="button" className="btn-secondary btn-sm" onClick={addReferenceSite}>
                      <Plus size={14} /> Add reference
                    </button>
                  </div>
                  {form.referenceSites.map((site, index) => (
                    <div key={index} className="reference-site-row">
                      <input
                        value={site.label}
                        onChange={(e) => updateReferenceSite(index, "label", e.target.value)}
                        placeholder="Label (e.g. Competitor A)"
                      />
                      <input
                        type="url"
                        value={site.url}
                        onChange={(e) => updateReferenceSite(index, "url", e.target.value)}
                        placeholder="https://reference-site.com"
                      />
                      {form.referenceSites.length > 1 && (
                        <button type="button" className="flock-icon-btn" onClick={() => removeReferenceSite(index)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <label className="full-width-field">
                  Suggestions & requirements
                  <textarea
                    rows={4}
                    value={form.suggestions}
                    onChange={(e) => setForm({ ...form, suggestions: e.target.value })}
                    placeholder="Design preferences, features, content notes, deadlines..."
                  />
                </label>
              </div>

              <div className="employee-form-section">
                <h4>External CRM integrations</h4>
                <p className="field-hint">
                  Save LeadSquared, Salesforce, Google Sheets, HubSpot, Zoho, or other CRM connection details.
                </p>
                <ExternalCrmIntegrationsEditor
                  integrations={form.externalCrmIntegrations || []}
                  editing
                  onChange={(next) => setForm({ ...form, externalCrmIntegrations: next })}
                />
              </div>

              <div className="employee-form-section">
                <h4>Project documents</h4>
                <p className="field-hint">Upload briefs, wireframes, brand assets, or contracts (max 5MB each)</p>
                <div className="employee-doc-upload">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={docLoading}
                  >
                    <Paperclip size={16} /> {docLoading ? "Uploading…" : "Upload documents"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
                {form.documents.length > 0 && (
                  <ul className="employee-doc-list">
                    {form.documents.map((doc, index) => (
                      <li key={`${doc.name}-${index}`}>
                        <a href={doc.dataUrl} target="_blank" rel="noreferrer" download={doc.name}>{doc.name}</a>
                        <button type="button" className="flock-icon-btn" onClick={() => removeDocument(index)}>
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="employee-form-section assign-employees-section">
                <div className="employee-section-header">
                  <span className="field-label">Assign employees</span>
                  <span className="assign-selected-count">
                    {(form.assignedEmployeeIds || []).length} selected
                  </span>
                </div>
                <div className="assign-grid">
                  {employees.length === 0 ? (
                    <span className="muted">No employees available</span>
                  ) : (
                    employees.map((emp) => (
                      <label
                        key={emp.id}
                        className={`assign-chip ${(form.assignedEmployeeIds || []).includes(emp.id) ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={(form.assignedEmployeeIds || []).includes(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                        />
                        <span className="assign-chip-body">
                          <strong>{emp.name}</strong>
                          <small>{emp.department}</small>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? "Save Changes" : "Create Project"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
