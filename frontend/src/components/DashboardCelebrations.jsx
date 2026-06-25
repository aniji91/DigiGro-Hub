import { Cake, PartyPopper, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardCelebrations({ celebrations = [] }) {
  if (!celebrations.length) return null;

  const todayItems = celebrations.filter((item) => item.isToday);
  const upcomingItems = celebrations.filter((item) => !item.isToday);

  return (
    <section className="dashboard-celebrations">
      <div className="dashboard-celebrations-header">
        <h2>Announcements & Celebrations</h2>
        <Link to="/announcements" className="panel-link">View all →</Link>
      </div>

      {todayItems.length > 0 && (
        <div className="celebration-group">
          <h3>Today</h3>
          <div className="celebration-cards">
            {todayItems.map((item) => (
              <CelebrationCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {upcomingItems.length > 0 && (
        <div className="celebration-group">
          <h3>Coming up this week</h3>
          <div className="celebration-cards">
            {upcomingItems.map((item) => (
              <CelebrationCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CelebrationCard({ item, compact = false }) {
  const isBirthday = item.type === "birthday";
  const Icon = isBirthday ? Cake : PartyPopper;

  return (
    <article className={`celebration-card ${item.type} ${compact ? "compact" : ""}`}>
      <div className="celebration-card-icon">
        <Icon size={compact ? 18 : 22} />
      </div>
      <div className="celebration-card-body">
        <strong>{isBirthday ? "Birthday Wish" : "Work Anniversary"}</strong>
        <p>{item.message}</p>
        <span className="celebration-meta">
          {item.employeeName}
          {item.department ? ` · ${item.department}` : ""}
          {!item.isToday ? ` · ${formatDate(item.date)}` : ""}
        </span>
      </div>
    </article>
  );
}

export function DashboardAnnouncementStrip({ announcements = [] }) {
  if (!announcements.length) return null;

  return (
    <div className="dashboard-announcement-strip">
      {announcements.slice(0, 3).map((item) => (
        <div key={item.id} className="announcement-strip-item">
          <Megaphone size={16} />
          <div>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
