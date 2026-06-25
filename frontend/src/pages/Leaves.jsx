import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Filter, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { leavesApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import LeaveAllocationPanel from "../components/LeaveAllocationPanel";

const EMPTY = {
  employeeId: "",
  employeeName: "",
  type: "Annual Leave",
  startDate: "",
  endDate: "",
  status: "Pending",
  reason: "",
};

const MANAGER_ROLES = new Set(["superadmin", "admin", "hr"]);

function formatLeaveDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function leaveDuration(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

function employeeInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Leaves() {
  const { user, permissions } = useAuth();
  const perms = permissions.leaves || {};
  const isEmployee = user.role === "employee";
  const canManage = MANAGER_ROLES.has(user.role);
  const currentYear = new Date().getFullYear();

  const [activeTab, setActiveTab] = useState("requests");
  const [allocationYear, setAllocationYear] = useState(currentYear);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterYear, setFilterYear] = useState(String(currentYear));

  const yearLeaves = useMemo(() => {
    if (!filterYear) return leaves;
    const year = Number(filterYear);
    return leaves.filter((leave) => {
      const startYear = Number(leave.startDate?.slice(0, 4));
      const endYear = Number(leave.endDate?.slice(0, 4));
      return startYear <= year && endYear >= year;
    });
  }, [leaves, filterYear]);

  const stats = useMemo(() => ({
    total: yearLeaves.length,
    pending: yearLeaves.filter((l) => l.status === "Pending").length,
    approved: yearLeaves.filter((l) => l.status === "Approved").length,
    rejected: yearLeaves.filter((l) => l.status === "Rejected").length,
  }), [yearLeaves]);

  const filteredLeaves = useMemo(() => {
    return yearLeaves.filter((leave) => {
      if (filterEmployee && leave.employeeId !== Number(filterEmployee)) return false;
      if (filterStatus && leave.status !== filterStatus) return false;
      if (filterType && leave.type !== filterType) return false;
      return true;
    });
  }, [yearLeaves, filterEmployee, filterStatus, filterType]);

  const hasActiveFilters = Boolean(filterEmployee || filterStatus || filterType);

  const columns = [
    ...(canManage
      ? [
          {
            key: "employeeName",
            label: "Employee",
            render: (value) => (
              <div className="leave-employee-cell">
                <span className="leave-employee-avatar">{employeeInitials(value)}</span>
                <strong>{value}</strong>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "type",
      label: "Leave Type",
      render: (value) => <span className="leave-type-pill">{value}</span>,
    },
    {
      key: "startDate",
      label: "Duration",
      render: (_, row) => (
        <div className="leave-duration-cell">
          <span>{formatLeaveDate(row.startDate)} – {formatLeaveDate(row.endDate)}</span>
          <em>{leaveDuration(row.startDate, row.endDate)} day(s)</em>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <span className={`badge status-${v.toLowerCase()}`}>{v}</span>,
    },
    {
      key: "reason",
      label: "Reason",
      render: (value) => value || <span className="muted">—</span>,
    },
  ];

  async function load() {
    try {
      setError("");
      const leaveData = await leavesApi.fetchAll();
      setLeaves(leaveData);

      if (canManage) {
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

  function clearFilters() {
    setFilterEmployee("");
    setFilterStatus("");
    setFilterType("");
    setFilterYear(String(currentYear));
  }

  return (
    <div className="leave-page">
      <div className="leave-page-top">
        <PageHeader
          title={isEmployee ? "My Leaves" : "Leave Management"}
          subtitle={
            isEmployee
              ? "Apply for leave and track your request status"
              : "Manage leave requests and employee leave balances"
          }
          actionLabel={
            activeTab === "requests"
              ? isEmployee
                ? "Apply for Leave"
                : "Add Leave"
              : undefined
          }
          onAction={activeTab === "requests" ? openCreate : undefined}
          showAction={activeTab === "requests" && perms.create}
        />

        {canManage && (
          <div className="leave-tabs">
            <button
              type="button"
              className={`leave-tab ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              Leave Requests
              <span className="leave-tab-count">{stats.total}</span>
            </button>
            <button
              type="button"
              className={`leave-tab ${activeTab === "allocation" ? "active" : ""}`}
              onClick={() => setActiveTab("allocation")}
            >
              Leave Allocation
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      {activeTab === "allocation" && canManage ? (
        <LeaveAllocationPanel year={allocationYear} onYearChange={setAllocationYear} />
      ) : loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <>
          <div className="leave-stats-grid">
            <button
              type="button"
              className={`leave-stat-card ${!filterStatus ? "active" : ""}`}
              onClick={() => setFilterStatus("")}
            >
              <StatCard label="Total requests" value={stats.total} icon={CalendarDays} color="#3b82f6" />
            </button>
            <button
              type="button"
              className={`leave-stat-card ${filterStatus === "Pending" ? "active" : ""}`}
              onClick={() => setFilterStatus("Pending")}
            >
              <StatCard label="Pending" value={stats.pending} icon={Clock3} color="#f59e0b" />
            </button>
            <button
              type="button"
              className={`leave-stat-card ${filterStatus === "Approved" ? "active" : ""}`}
              onClick={() => setFilterStatus("Approved")}
            >
              <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="#10b981" />
            </button>
            <button
              type="button"
              className={`leave-stat-card ${filterStatus === "Rejected" ? "active" : ""}`}
              onClick={() => setFilterStatus("Rejected")}
            >
              <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="#ef4444" />
            </button>
          </div>

          <div className="leave-panel">
            <div className="leave-panel-head">
              <div>
                <h3><Filter size={16} /> Filters</h3>
                <p className="muted">
                  Showing {filteredLeaves.length} of {yearLeaves.length} request(s) in {filterYear || "all years"}
                </p>
              </div>
              {hasActiveFilters && (
                <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>

            <div className="leave-filters-grid">
              {canManage && (
                <label>
                  Employee
                  <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                    <option value="">All employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Status
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </label>
              <label>
                Leave type
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">All types</option>
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Personal Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </label>
              <label>
                Year
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  <option value="">All years</option>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
            </div>

            <DataTable
              columns={columns}
              rows={filteredLeaves}
              onEdit={openEdit}
              onDelete={handleDelete}
              canEdit={perms.edit || isEmployee}
              canEditRow={isEmployee ? (row) => row.status === "Pending" : undefined}
              canDelete={perms.delete}
            />
          </div>
        </>
      )}

      {showModal && (
        <Modal
          title={editing ? (isEmployee ? "Edit Leave Request" : "Edit Leave") : (isEmployee ? "Apply for Leave" : "Add Leave")}
          onClose={() => setShowModal(false)}
          wide
        >
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              {canManage && (
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
              {canManage && (
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
    </div>
  );
}
