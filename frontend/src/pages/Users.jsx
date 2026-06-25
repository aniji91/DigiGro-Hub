import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createUser, deleteUser, fetchUsers, fetchUserAssignableRoles } from "../api/userApi";
import { fetchEmployees } from "../api/employeeApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const EMPTY = { name: "", username: "", password: "", role: "", employeeId: "" };

export default function Users() {
  const { permissions, roleLabels } = useAuth();
  const perms = permissions.users || {};

  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: "name", label: "Name" },
    { key: "username", label: "Username", render: (v) => `@${v}` },
    { key: "role", label: "Role", render: (v) => <span className="badge">{roleLabels[v] || v}</span> },
    { key: "employeeId", label: "Linked Employee", render: (v) => v || "—" },
  ];

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchEmployees(),
      fetchUserAssignableRoles().catch(() => ({ roles: [] })),
    ])
      .then(([users, emps, rolesData]) => {
        setItems(users);
        setEmployees(emps);
        setAssignableRoles(rolesData.roles || []);
        setForm((prev) => ({
          ...prev,
          role: rolesData.roles?.[0]?.value || "",
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      const payload = { ...form };
      if (form.role !== "employee") delete payload.employeeId;
      const created = await createUser(payload);
      setItems((prev) => [...prev, created]);
      setForm({ ...EMPTY, role: assignableRoles[0]?.value || "" });
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteUser(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Create login accounts and assign system roles"
        actionLabel="Add User"
        onAction={() => setShowModal(true)}
        showAction={perms.create}
      />
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          onDelete={handleDelete}
          canDelete={perms.delete}
          canEdit={false}
        />
      )}
      {showModal && (
        <Modal title="Add User" onClose={() => setShowModal(false)}>
          <form className="crm-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Username
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <label>
              Role <span className="required-mark">*</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value, employeeId: "" })}
                required
              >
                <option value="">Select role</option>
                {assignableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            {form.role === "employee" && (
              <label>
                Link to Employee Record
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.department}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
