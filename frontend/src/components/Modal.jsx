import { X } from "lucide-react";

export default function Modal({ title, onClose, children, wide, size }) {
  const sizeClass =
    size === "xl" ? "modal-xl" : size === "wide" || wide ? "modal-wide" : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-panel ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body modal-body-scroll">{children}</div>
      </div>
    </div>
  );
}
