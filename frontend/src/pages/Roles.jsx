import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRole, deleteRole, fetchRoleMeta, fetchRoles, updateRole } from "../api/roleApi";
import { ACCESS_LABELS, MODULE_LABELS } from "../config/roleConfig";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const EMPTY = {
  label: "",
  key: "",
  description: "",
  color: "#6366f1",
  assignableBy: [],
  modulePermissions: {},
};

export default function Roles() {
  const { permissions, roleLabels } = useAuth();
  const perms = permissions.roles || {};

  const [items, setItems] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [meta, setMeta] = useState({ modules: [], accessLevels: [] });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: "label", label: "Role" },
    { key: "key", label: "Key", render: (v) => <code>{v}</code> },
    {
      key: "color",
      label: "Color",
      render: (v) => (
        <span className="role-color-swatch" style={{ background: v }} title={v} />
      ),
    },
    {
      key: "isSystem",
      label: "Type",
      render: (v) => <span className="badge">{v ? "System" : "Custom"}</span>,
    },
    {
      key: "assignableBy",
      label: "Assignable By",
      render: (ids) =>
        (ids || []).map((id) => roleLabels[id] || id).join(", ") || "—",
    },
  ];

  async function load() {
    try {
      setError("");
      const [roles, roleMeta] = await Promise.all([fetchRoles(), fetchRoleMeta()]);
      setItems(roles);
      setAllRoles(roles);
      setMeta(roleMeta);
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
    setForm({ ...EMPTY, modulePermissions: {} });
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      label: row.label,
      key: row.key,
      description: row.description || "",
      color: row.color || "#6366f1",
      assignableBy: [...(row.assignableBy || [])],
      modulePermissions: { ...(row.modulePermissions || {}) },
    });
    setShowModal(true);
  }

  function toggleAssignable(roleKey) {
    setForm((prev) => {
      const next = prev.assignableBy.includes(roleKey)
        ? prev.assignableBy.filter((k) => k !== roleKey)
        : [...prev.assignableBy, roleKey];
      return { ...prev, assignableBy: next };
    });
  }

  function setModuleAccess(module, access) {
    setForm((prev) => {
      const next = { ...prev.modulePermissions };
      if (!access) delete next[module];
      else next[module] = access;
      return { ...prev, modulePermissions: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        label: form.label,
        description: form.description,
        color: form.color,
        assignableBy: form.assignableBy,
        modulePermissions: form.modulePermissions,
      };
      if (!editing) payload.key = form.key;

      if (editing) {
        const updated = await updateRole(editing.id, payload);
        setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createRole(payload);
        setItems((prev) => [...prev, created]);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this role?")) return;
    try {
      await deleteRole(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Role Management"
        subtitle="Create and manage system roles, permissions, and assignment rules"
        actionLabel="Add Role"
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
          onView={setViewing}
          onEdit={openEdit}
          onDelete={handleDelete}
          canView
          canEdit={perms.edit}
          canDelete={perms.delete}
        />
      )}

      {viewing && (
        <Modal title={`Role: ${viewing.label}`} onClose={() => setViewing(null)} wide>
          <div className="view-details">
            <div className="view-row"><span>Key</span><strong><code>{viewing.key}</code></strong></div>
            <div className="view-row"><span>Description</span><strong>{viewing.description || "—"}</strong></div>
            <div className="view-row"><span>Type</span><strong>{viewing.isSystem ? "System" : "Custom"}</strong></div>
            <div className="view-row">
              <span>Assignable by</span>
              <strong>{(viewing.assignableBy || []).map((k) => roleLabels[k] || k).join(", ") || "—"}</strong>
            </div>
          </div>
          <h4 className="role-perms-title">Module permissions</h4>
          <ul className="role-perms-view">
            {Object.entries(viewing.modulePermissions || {}).map(([mod, access]) => (
              <li key={mod}>
                <span>{MODULE_LABELS[mod] || mod}</span>
                <span className="badge">{ACCESS_LABELS[access] || access}</span>
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Role" : "Add Role"} onClose={() => setShowModal(false)} wide>
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <label>
                Role name
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  required
                />
              </label>
              {!editing && (
                <label>
                  Role key
                  <input
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    placeholder="auto-generated from name if empty"
                  />
                </label>
              )}
              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label>
                Badge color
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </label>
              <div className="assign-section">
                <span className="field-label">Who can assign this role</span>
                <div className="assign-grid">
                  {allRoles.map((role) => (
                    <label key={role.key} className="assign-chip">
                      <input
                        type="checkbox"
                        checked={form.assignableBy.includes(role.key)}
                        onChange={() => toggleAssignable(role.key)}
                        disabled={editing?.key === role.key}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="role-perms-section">
                <span className="field-label">Module permissions</span>
                <div className="role-perms-grid">
                  {meta.modules.map((module) => (
                    <label key={module} className="role-perm-row">
                      <span>{MODULE_LABELS[module] || module}</span>
                      <select
                        value={form.modulePermissions[module] || ""}
                        onChange={(e) => setModuleAccess(module, e.target.value)}
                      >
                        <option value="">No access</option>
                        {meta.accessLevels.map((level) => (
                          <option key={level} value={level}>
                            {ACCESS_LABELS[level]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? "Save Role" : "Create Role"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
