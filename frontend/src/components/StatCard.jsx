export default function StatCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-icon" style={{ background: `${color}18`, color }}>
          <Icon size={22} />
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
