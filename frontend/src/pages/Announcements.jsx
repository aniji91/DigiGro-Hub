import { useEffect, useMemo, useState } from "react";
import { Cake, Megaphone, PartyPopper } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { announcementsApi, fetchAnnouncements } from "../api/crmApi";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";

const EMPTY = {
  title: "",
  body: "",
  publishDate: new Date().toISOString().slice(0, 10),
  expiresAt: "",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Announcements() {
  const { permissions } = useAuth();
  const perms = permissions.announcements || {};

  const [celebrations, setCelebrations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: "title", label: "Title" },
    { key: "publishDate", label: "Published", render: (v) => formatDate(v) },
    { key: "expiresAt", label: "Expires", render: (v) => formatDate(v) },
    { key: "authorName", label: "Posted By" },
    {
      key: "isActive",
      label: "Status",
      render: (v) => <span className={`badge ${v ? "status-approved" : "status-rejected"}`}>{v ? "Active" : "Inactive"}</span>,
    },
  ];

  const todayCelebrations = useMemo(
    () => celebrations.filter((item) => item.isToday),
    [celebrations]
  );

  const upcomingCelebrations = useMemo(
    () => celebrations.filter((item) => !item.isToday),
    [celebrations]
  );

  async function load() {
    try {
      setError("");
      const data = await fetchAnnouncements();
      setCelebrations(data.celebrations || []);
      setAnnouncements(data.announcements || []);
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

  function openEdit(row) {
    setEditing(row);
    setForm({
      title: row.title,
      body: row.body,
      publishDate: row.publishDate || "",
      expiresAt: row.expiresAt || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null,
      };
      if (editing) {
        const updated = await announcementsApi.update(editing.id, payload);
        setAnnouncements((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await announcementsApi.create(payload);
        setAnnouncements((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await announcementsApi.remove(id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle="Company updates, birthday wishes, and work anniversaries"
        actionLabel="New Announcement"
        onAction={openCreate}
        showAction={perms.create}
      />
      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <>
          <section className="announcements-section">
            <h3><Cake size={18} /> Birthday Wishes</h3>
            {todayCelebrations.filter((item) => item.type === "birthday").length === 0 &&
            upcomingCelebrations.filter((item) => item.type === "birthday").length === 0 ? (
              <p className="muted">No birthdays in the next 30 days.</p>
            ) : (
              <div className="celebration-cards">
                {[...todayCelebrations, ...upcomingCelebrations]
                  .filter((item) => item.type === "birthday")
                  .map((item) => (
                    <article key={item.id} className={`celebration-card birthday ${item.isToday ? "" : "compact"}`}>
                      <div className="celebration-card-icon"><Cake size={20} /></div>
                      <div className="celebration-card-body">
                        <strong>{item.isToday ? "Today" : formatDate(item.date)}</strong>
                        <p>{item.message}</p>
                        <span className="celebration-meta">{item.employeeName} · {item.position}</span>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>

          <section className="announcements-section">
            <h3><PartyPopper size={18} /> Work Anniversaries</h3>
            {todayCelebrations.filter((item) => item.type === "anniversary").length === 0 &&
            upcomingCelebrations.filter((item) => item.type === "anniversary").length === 0 ? (
              <p className="muted">No work anniversaries in the next 30 days.</p>
            ) : (
              <div className="celebration-cards">
                {[...todayCelebrations, ...upcomingCelebrations]
                  .filter((item) => item.type === "anniversary")
                  .map((item) => (
                    <article key={item.id} className={`celebration-card anniversary ${item.isToday ? "" : "compact"}`}>
                      <div className="celebration-card-icon"><PartyPopper size={20} /></div>
                      <div className="celebration-card-body">
                        <strong>{item.isToday ? "Today" : formatDate(item.date)}</strong>
                        <p>{item.message}</p>
                        <span className="celebration-meta">{item.employeeName} · {item.years} year{item.years === 1 ? "" : "s"}</span>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>

          <section className="announcements-section">
            <h3><Megaphone size={18} /> Company Announcements</h3>
            {perms.create ? (
              <DataTable
                columns={columns}
                rows={announcements}
                onEdit={openEdit}
                onDelete={handleDelete}
                canEdit={perms.edit}
                canDelete={perms.delete}
              />
            ) : announcements.length === 0 ? (
              <p className="muted">No announcements right now.</p>
            ) : (
              <div className="announcement-feed">
                {announcements.map((item) => (
                  <article key={item.id} className="announcement-feed-card">
                    <div>
                      <strong>{item.title}</strong>
                      <span className="celebration-meta">{formatDate(item.publishDate)} · {item.authorName}</span>
                    </div>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showModal && (
        <Modal title={editing ? "Edit Announcement" : "New Announcement"} onClose={() => setShowModal(false)} wide>
          <form className="modal-form-layout" onSubmit={handleSubmit}>
            <div className="modal-form-fields">
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </label>
              <label className="full-width-field">
                Message
                <textarea
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
              </label>
              <label>
                Publish Date
                <input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                  required
                />
              </label>
              <label>
                Expires
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">{editing ? "Save Changes" : "Publish"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
