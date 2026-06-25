import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { leavesApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const EMPTY = {
  employeeId: "",
  employeeName: "",
  type: "Annual Leave",
  startDate: "",
  endDate: "",
  status: "Pending",
  reason: "",
};

export default function Leaves() {
  const { user, permissions } = useAuth();
  const perms = permissions.leaves || {};
  const isEmployee = user.role === "employee";
  const isHr = user.role === "hr" || user.role === "superadmin";

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const columns = [
    ...(isHr ? [{ key: "employeeName", label: "Employee" }] : []),
    { key: "type", label: "Leave Type" },
    { key: "startDate", label: "From" },
    { key: "endDate", label: "To" },
    { key: "status", label: "Status", render: (v) => <span className={`badge status-${v.toLowerCase()}`}>{v}</span> },
    { key: "reason", label: "Reason" },
  ];

  async function load() {
    try {
      setError("");
      const leaveData = await leavesApi.fetchAll();
      setLeaves(leaveData);

      if (isHr) {
        const employeeData = await fetchEmployees();
        setEmployees(employeeData);
      }
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
    setForm(
      isEmployee
        ? { ...EMPTY, employeeId: String(user.employeeId), employeeName: user.name }
        : EMPTY
    );
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      employeeId: String(row.employeeId),
      employeeName: row.employeeName,
      type: row.type,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      reason: row.reason || "",
    });
    setShowModal(true);
  }

  function handleEmployeeChange(e) {
    const id = Number(e.target.value);
    const emp = employees.find((x) => x.id === id);
    setForm((prev) => ({
      ...prev,
      employeeId: e.target.value,
      employeeName: emp ? emp.name : "",
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      if (editing) {
        const payload = isEmployee
          ? { type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason }
          : { ...form, employeeId: Number(form.employeeId) };
        const updated = await leavesApi.update(editing.id, payload);
        setLeaves((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const payload = isEmployee
          ? { type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason }
          : { ...form, employeeId: Number(form.employeeId) };
        const created = await leavesApi.create(payload);
        setLeaves((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this leave record?")) return;
    try {
      await leavesApi.remove(id);
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title={isEmployee ? "My Leaves" : "Leave Management"}
        subtitle={
          isEmployee
            ? "Apply for leave and track your request status"
            : "Track and approve employee leave requests"
        }
        actionLabel={isEmployee ? "Apply for Leave" : "Add Leave"}
        onAction={openCreate}
        showAction={perms.create}
      />
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={leaves}
          onEdit={openEdit}
          onDelete={handleDelete}
          canEdit={perms.edit || isEmployee}
          canEditRow={isEmployee ? (row) => row.status === "Pending" : undefined}
          canDelete={perms.delete}
        />
      )}
      {showModal && (
        <Modal
          title={editing ? (isEmployee ? "Edit Leave Request" : "Edit Leave") : (isEmployee ? "Apply for Leave" : "Add Leave")}
          onClose={() => setShowModal(false)}
          wide
        >
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              {isHr && (
                <label>
                  Employee
                  <select value={form.employeeId} onChange={handleEmployeeChange} required disabled={Boolean(editing)}>
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>
                    ))}
                  </select>
                </label>
              )}
              {isEmployee && (
                <label>
                  Employee
                  <input value={form.employeeName} disabled />
                </label>
              )}
              <label>
                Leave Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Personal Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </label>
              <label>
                Start Date
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </label>
              <label>
                End Date
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </label>
              {isHr && (
                <label>
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </label>
              )}
              <label>
                Reason
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder={isEmployee ? "Brief reason for your leave request" : ""}
                />
              </label>
              {isEmployee && !editing && (
                <p className="field-hint">Your request will be submitted as Pending for HR approval.</p>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">
                {editing ? "Save Changes" : isEmployee ? "Submit Request" : "Submit"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
