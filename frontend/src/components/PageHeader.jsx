import { Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, actionLabel, onAction, showAction }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {showAction && onAction && (
        <button type="button" className="btn-primary" onClick={onAction}>
          <Plus size={18} />
          {actionLabel || "Add New"}
        </button>
      )}
    </div>
  );
}
