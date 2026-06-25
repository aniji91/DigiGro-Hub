import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DataTable from "./DataTable";
import Modal from "./Modal";
import PageHeader from "./PageHeader";

export default function CrmModulePage({
  title,
  subtitle,
  module,
  api,
  columns,
  fields,
  emptyForm,
}) {
  const { permissions } = useAuth();
  const perms = permissions[module] || {};

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setError("");
      const data = await api.fetchAll();
      setItems(data);
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
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    const next = {};
    fields.forEach((f) => {
      next[f.name] = row[f.name] ?? "";
    });
    setForm(next);
    setShowModal(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      if (editing) {
        const updated = await api.update(editing.id, form);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.create(form);
        setItems((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      setError("");
      await api.remove(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actionLabel={`Add ${title.slice(0, -1)}`}
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
        <Modal title={editing ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`} onClose={() => setShowModal(false)}>
          <form className="crm-form" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <label key={field.name}>
                {field.label}
                {field.type === "select" ? (
                  <select name={field.name} value={form[field.name]} onChange={handleChange} required={field.required}>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    value={form[field.name]}
                    onChange={handleChange}
                    required={field.required !== false}
                  />
                )}
              </label>
            ))}
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
