import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useChatNotifications } from "../context/ChatNotificationContext";

export default function ChatToastStack() {
  const { toasts, dismissToast } = useChatNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timer = setTimeout(() => dismissToast(toasts[toasts.length - 1].id), 8000);
    return () => clearTimeout(timer);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="chat-toast-stack">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`chat-toast ${toast.mentionUnread ? "mention" : ""}`}
          onClick={() => {
            dismissToast(toast.id);
            navigate(`/chat?channel=${toast.channelId}`);
          }}
        >
          <div className="chat-toast-body">
            <strong>
              {toast.mentionUnread ? "Mentioned in " : "New message in "}
              {toast.channelName}
            </strong>
            <span>
              {toast.userName}: {toast.text}
            </span>
          </div>
          <span
            className="chat-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(toast.id);
            }}
            role="presentation"
          >
            <X size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}
