import { useEffect, useMemo, useState } from "react";
import { Calendar, Gift } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchHolidays, holidaysApi } from "../api/crmApi";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const CURRENT_YEAR = new Date().getFullYear();

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EMPTY = { name: "", date: "", type: "Public Holiday", description: "" };

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function HolidayCalendar() {
  const { permissions } = useAuth();
  const perms = permissions.holidays || {};
  const canManage = perms.create;

  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () => holidays.filter((h) => h.date >= today),
    [holidays, today]
  );

  const nextHoliday = upcoming[0];

  const byMonth = useMemo(() => {
    return MONTH_NAMES.map((name, index) => ({
      month: index,
      name,
      holidays: holidays.filter((h) => new Date(h.date + "T00:00:00").getMonth() === index),
    }));
  }, [holidays]);

  async function load() {
    try {
      setError("");
      setHolidays(await fetchHolidays(CURRENT_YEAR));
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
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(holiday) {
    setEditing(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      description: holiday.description || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      if (editing) {
        const updated = await holidaysApi.update(editing.id, form);
        setHolidays((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      } else {
        const created = await holidaysApi.create(form);
        setHolidays((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this holiday?")) return;
    try {
      await holidaysApi.remove(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Holiday Calendar"
        subtitle={
          canManage
            ? `Manage company holidays for ${CURRENT_YEAR}`
            : `Company holidays for ${CURRENT_YEAR}`
        }
        actionLabel="Add Holiday"
        onAction={openCreate}
        showAction={canManage}
      />

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading calendar...</div>
      ) : (
        <>
          <div className="holiday-summary">
            <div className="holiday-summary-card">
              <Calendar size={22} />
              <div>
                <strong>{holidays.length}</strong>
                <span>Total holidays in {CURRENT_YEAR}</span>
              </div>
            </div>
            <div className="holiday-summary-card">
              <Gift size={22} />
              <div>
                <strong>{upcoming.length}</strong>
                <span>Upcoming holidays</span>
              </div>
            </div>
            {nextHoliday && (
              <div className="holiday-summary-card highlight">
                <div>
                  <strong>{nextHoliday.name}</strong>
                  <span>Next: {formatDate(nextHoliday.date)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="holiday-year-grid">
            {byMonth.map(({ month, name, holidays: monthHolidays }) => {
              const daysInMonth = getDaysInMonth(CURRENT_YEAR, month);
              const firstDay = getFirstDayOfMonth(CURRENT_YEAR, month);
              const holidayDates = new Set(monthHolidays.map((h) => h.date));

              return (
                <div key={name} className="holiday-month-card">
                  <div className="holiday-month-header">
                    <h3>{name}</h3>
                    <span>{monthHolidays.length} holiday{monthHolidays.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="mini-calendar">
                    <div className="mini-cal-labels">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                    <div className="mini-cal-days">
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <span key={`empty-${i}`} className="mini-cal-day empty" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${CURRENT_YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isHoliday = holidayDates.has(dateStr);
                        const isToday = dateStr === today;
                        return (
                          <span
                            key={day}
                            className={`mini-cal-day ${isHoliday ? "holiday" : ""} ${isToday ? "today" : ""}`}
                            title={isHoliday ? monthHolidays.find((h) => h.date === dateStr)?.name : ""}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {monthHolidays.length > 0 ? (
                    <ul className="holiday-list">
                      {monthHolidays.map((holiday) => (
                        <li key={holiday.id} className="holiday-item">
                          <div className="holiday-item-info">
                            <strong>{holiday.name}</strong>
                            <span>{formatDate(holiday.date)} · {holiday.type}</span>
                            {holiday.description && <p>{holiday.description}</p>}
                          </div>
                          {canManage && (
                            <div className="holiday-item-actions">
                              <button type="button" className="btn-text" onClick={() => openEdit(holiday)}>Edit</button>
                              <button type="button" className="btn-text danger" onClick={() => handleDelete(holiday.id)}>Delete</button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted holiday-empty-month">No holidays this month</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Holiday" : "Add Holiday"} onClose={() => setShowModal(false)} wide>
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <label>
                Holiday Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  min={`${CURRENT_YEAR}-01-01`}
                  max={`${CURRENT_YEAR}-12-31`}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>
              <label>
                Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Public Holiday</option>
                  <option>Company Holiday</option>
                  <option>Optional Holiday</option>
                </select>
              </label>
              <label>
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note for employees"
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? "Save Changes" : "Add Holiday"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
