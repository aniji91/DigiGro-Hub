import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { leaveAllocationsApi, fetchLeaveAllocations } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";

const EMPTY_ALLOCATION = {
  employeeId: "",
  employeeName: "",
  year: String(new Date().getFullYear()),
  annualLeave: "20",
  sickLeave: "10",
  personalLeave: "5",
  unpaidLeave: "0",
  notes: "",
};

const LEAVE_TYPES = [
  { key: "Annual Leave", field: "annualLeave", color: "#3b82f6" },
  { key: "Sick Leave", field: "sickLeave", color: "#10b981" },
  { key: "Personal Leave", field: "personalLeave", color: "#8b5cf6" },
  { key: "Unpaid Leave", field: "unpaidLeave", color: "#6b7280" },
];

function UsageCell({ used = 0, total = 0, color }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="leave-usage-cell">
      <div className="leave-usage-bar">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="leave-usage-text">{used} / {total} days</span>
    </div>
  );
}

export default function LeaveAllocationPanel({ year, onYearChange }) {
  const { permissions } = useAuth();
  const perms = permissions.leaves || {};

  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY_ALLOCATION);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState("");

  const columns = [
    { key: "employeeName", label: "Employee" },
    ...LEAVE_TYPES.map(({ key, field, color }) => ({
      key: field,
      label: key.replace(" Leave", ""),
      render: (_, row) => (
        <UsageCell
          used={row.used?.[key] || 0}
          total={row[field] || 0}
          color={color}
        />
      ),
    })),
    {
      key: "remaining",
      label: "Annual left",
      render: (_, row) => (
        <strong className="leave-remaining-pill">{row.remaining?.["Annual Leave"] ?? 0} days</strong>
      ),
    },
  ];

  async function load() {
    try {
      setError("");
      setLoading(true);
      const [allocationData, employeeData] = await Promise.all([
        fetchLeaveAllocations(year),
        fetchEmployees(),
      ]);
      setAllocations(allocationData);
      setEmployees(employeeData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [year]);

  const displayedAllocations = useMemo(() => {
    if (!filterEmployee) return allocations;
    return allocations.filter((item) => item.employeeId === Number(filterEmployee));
  }, [allocations, filterEmployee]);

  const unallocatedCount = useMemo(() => {
    const allocatedIds = new Set(allocations.map((item) => item.employeeId));
    return employees.filter((emp) => !allocatedIds.has(emp.id)).length;
  }, [allocations, employees]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_ALLOCATION, year: String(year) });
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      employeeId: String(row.employeeId),
      employeeName: row.employeeName,
      year: String(row.year),
      annualLeave: String(row.annualLeave),
      sickLeave: String(row.sickLeave),
      personalLeave: String(row.personalLeave),
      unpaidLeave: String(row.unpaidLeave),
      notes: row.notes || "",
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
      const payload = {
        employeeId: Number(form.employeeId),
        employeeName: form.employeeName,
        year: Number(form.year),
        annualLeave: Number(form.annualLeave),
        sickLeave: Number(form.sickLeave),
        personalLeave: Number(form.personalLeave),
        unpaidLeave: Number(form.unpaidLeave),
        notes: form.notes,
      };

      if (editing) {
        const updated = await leaveAllocationsApi.update(editing.id, payload);
        setAllocations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await leaveAllocationsApi.create(payload);
        setAllocations((prev) => {
          const without = prev.filter(
            (item) => !(item.employeeId === created.employeeId && item.year === created.year)
          );
          return [...without, created];
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this leave allocation?")) return;
    try {
      await leaveAllocationsApi.remove(id);
      setAllocations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="leave-panel">
      <div className="leave-panel-head">
        <div>
          <h3>Leave allocation — {year}</h3>
          <p className="muted">
            {displayedAllocations.length} employee(s) allocated
            {unallocatedCount > 0 ? ` · ${unallocatedCount} still need allocation` : ""}
          </p>
        </div>
        {perms.create && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Allocate Leave
          </button>
        )}
      </div>

      <div className="leave-filters-grid leave-filters-grid--compact">
        <label>
          Year
          <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Employee
          <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading allocations...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={displayedAllocations}
          onEdit={openEdit}
          onDelete={handleDelete}
          canEdit={perms.edit}
          canDelete={perms.delete}
        />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit Leave Allocation" : "Allocate Leave"}
          onClose={() => setShowModal(false)}
          wide
        >
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <label>
                Employee
                <select
                  value={form.employeeId}
                  onChange={handleEmployeeChange}
                  required
                  disabled={Boolean(editing)}
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  required
                />
              </label>
              <label>
                Annual leave (days)
                <input
                  type="number"
                  min="0"
                  value={form.annualLeave}
                  onChange={(e) => setForm({ ...form, annualLeave: e.target.value })}
                  required
                />
              </label>
              <label>
                Sick leave (days)
                <input
                  type="number"
                  min="0"
                  value={form.sickLeave}
                  onChange={(e) => setForm({ ...form, sickLeave: e.target.value })}
                  required
                />
              </label>
              <label>
                Personal leave (days)
                <input
                  type="number"
                  min="0"
                  value={form.personalLeave}
                  onChange={(e) => setForm({ ...form, personalLeave: e.target.value })}
                  required
                />
              </label>
              <label>
                Unpaid leave (days)
                <input
                  type="number"
                  min="0"
                  value={form.unpaidLeave}
                  onChange={(e) => setForm({ ...form, unpaidLeave: e.target.value })}
                  required
                />
              </label>
              <label className="span-full">
                Notes
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes for this allocation"
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">
                {editing ? "Save Allocation" : "Allocate Leave"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
