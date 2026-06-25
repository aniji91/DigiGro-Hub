import { useEffect, useRef, useState } from "react";
import { Paperclip, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchEmployees,
  fetchAssignableRoles,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../api/employeeApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const MAX_DOC_SIZE = 5 * 1024 * 1024;
const EMPTY_CONTACT = { name: "", relationship: "", phone: "", email: "" };

const EMPTY = {
  name: "",
  email: "",
  department: "",
  position: "",
  salary: "",
  dob: "",
  joiningDate: "",
  role: "",
  documents: [],
  emergencyContacts: [{ ...EMPTY_CONTACT }],
};

function formatSalary(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `$${Number(value).toLocaleString()}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function Employees() {
  const { permissions, roleLabels } = useAuth();
  const perms = permissions.employees || {};

  const [items, setItems] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);
  const fileInputRef = useRef(null);

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    {
      key: "loginRole",
      label: "Role",
      render: (v) => <span className="badge">{roleLabels[v] || v || "—"}</span>,
    },
    { key: "department", label: "Department", render: (v) => <span className="badge">{v}</span> },
    { key: "position", label: "Position" },
    { key: "joiningDate", label: "Joined", render: (v) => v || "—" },
    { key: "salary", label: "Salary", render: (v) => formatSalary(v) },
  ];

  async function load() {
    try {
      setError("");
      const [employees, rolesData] = await Promise.all([
        fetchEmployees(),
        fetchAssignableRoles().catch(() => ({ roles: [{ value: "employee", label: "Employee" }] })),
      ]);
      setItems(employees);
      setAssignableRoles(rolesData.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY,
      role: "employee",
      emergencyContacts: [{ ...EMPTY_CONTACT }],
    });
    setShowModal(true);
  }

  const roleOptions = assignableRoles;
  const currentRoleOption = assignableRoles.find((role) => role.value === form.role);

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      department: row.department || "",
      position: row.position || "",
      salary: row.salary != null && row.salary !== "" ? String(row.salary) : "",
      dob: row.dob || "",
      joiningDate: row.joiningDate || "",
      role: row.loginRole || "employee",
      documents: row.documents || [],
      emergencyContacts:
        row.emergencyContacts?.length > 0
          ? row.emergencyContacts.map((c) => ({ ...EMPTY_CONTACT, ...c }))
          : [{ ...EMPTY_CONTACT }],
    });
    setShowModal(true);
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

  function updateContact(index, field, value) {
    setForm((prev) => {
      const emergencyContacts = prev.emergencyContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      );
      return { ...prev, emergencyContacts };
    });
  }

  function addContact() {
    setForm((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { ...EMPTY_CONTACT }],
    }));
  }

  function removeContact(index) {
    setForm((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        emergencyContacts: form.emergencyContacts.filter(
          (c) => c.name.trim() || c.phone.trim()
        ),
      };
      if (editing) {
        const updated = await updateEmployee(editing.id, payload);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const created = await createEmployee(payload);
        setItems((prev) => [...prev, created]);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await deleteEmployee(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Manage employee profiles, roles, documents, and emergency contacts"
        actionLabel="Add Employee"
        onAction={openCreate}
        showAction={perms.create}
      />
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          onEdit={openEdit}
          onDelete={handleDelete}
          canEdit={perms.edit}
          canDelete={perms.delete}
        />
      )}
      {showModal && (
        <Modal
          title={editing ? "Edit Employee" : "Add Employee"}
          onClose={() => setShowModal(false)}
          size="xl"
        >
          <form className="modal-form-layout employee-form" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <div className="employee-form-section">
                <h4>Basic information</h4>
                <div className="employee-form-grid">
                  <label>
                    Name
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Department
                    <input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Position
                    <input
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Date of birth
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    />
                  </label>
                  <label>
                    Joining date
                    <input
                      type="date"
                      value={form.joiningDate}
                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Salary <span className="optional-mark">(optional)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      placeholder="Not specified"
                    />
                  </label>
                  <label>
                    System Role <span className="required-mark">*</span>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      required
                    >
                      <option value="">Select role</option>
                      {roleOptions.map((role) => {
                        const isCurrent = editing && role.value === form.role;
                        const disabled = !role.canAssign && !isCurrent;
                        return (
                          <option key={role.value} value={role.value} disabled={disabled}>
                            {role.label}{disabled ? " (not assignable)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {currentRoleOption?.description && (
                      <span className="field-hint">{currentRoleOption.description}</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="employee-form-section">
                <h4>Documents</h4>
                <p className="field-hint">Upload ID proof, offer letter, contracts, etc. (max 5MB each)</p>
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
                        <a
                          href={doc.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={doc.name}
                        >
                          {doc.name}
                        </a>
                        <button type="button" className="flock-icon-btn" onClick={() => removeDocument(index)}>
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="employee-form-section">
                <div className="employee-section-header">
                  <h4>Emergency contacts</h4>
                  <button type="button" className="btn-secondary btn-sm" onClick={addContact}>
                    <Plus size={14} /> Add contact
                  </button>
                </div>
                {form.emergencyContacts.map((contact, index) => (
                  <div key={index} className="emergency-contact-card">
                    <div className="employee-form-grid">
                      <label>
                        Name
                        <input
                          value={contact.name}
                          onChange={(e) => updateContact(index, "name", e.target.value)}
                          placeholder="Contact name"
                        />
                      </label>
                      <label>
                        Relationship
                        <input
                          value={contact.relationship}
                          onChange={(e) => updateContact(index, "relationship", e.target.value)}
                          placeholder="e.g. Spouse, Parent"
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          value={contact.phone}
                          onChange={(e) => updateContact(index, "phone", e.target.value)}
                          placeholder="+1 555 000 0000"
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(index, "email", e.target.value)}
                          placeholder="optional"
                        />
                      </label>
                    </div>
                    {form.emergencyContacts.length > 1 && (
                      <button
                        type="button"
                        className="btn-text danger"
                        onClick={() => removeContact(index)}
                      >
                        Remove contact
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!editing && (
                <p className="field-hint">
                  A login account will be created automatically. Default password: <strong>employee123</strong>
                </p>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
