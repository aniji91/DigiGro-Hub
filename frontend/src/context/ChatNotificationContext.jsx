import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { canView } from "../config/permissions";
import {
  fetchNotificationSummary,
  markChannelRead,
  sendPresenceHeartbeat,
} from "../api/chatApi";
import {
  isChatSoundEnabled,
  playChatSound,
  setChatSoundEnabled,
  unlockChatSound,
} from "../utils/chatSound";

const ChatNotificationContext = createContext(null);
const BROWSER_NOTIFY_KEY = "chat-browser-notifications";

function isBrowserNotifyEnabled() {
  return localStorage.getItem(BROWSER_NOTIFY_KEY) !== "false";
}

function setBrowserNotifyEnabled(enabled) {
  localStorage.setItem(BROWSER_NOTIFY_KEY, enabled ? "true" : "false");
}

async function requestBrowserPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function showBrowserNotification({ title, body, channelId, onClick }) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!isBrowserNotifyEnabled()) return;

  const notification = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: channelId ? `workhub-chat-${channelId}` : `workhub-chat-${Date.now()}`,
    renotify: true,
  });

  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };
}

export function ChatNotificationProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [summary, setSummary] = useState({ totalUnread: 0, totalMentions: 0, channels: [], recent: [] });
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(isChatSoundEnabled);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(isBrowserNotifyEnabled);
  const [notificationPermission, setNotificationPermission] = useState(
    () => (typeof Notification !== "undefined" ? Notification.permission : "unsupported")
  );
  const seenMessageIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const activeChannelIdRef = useRef(null);

  const chatEnabled = user && canView(user.role, "chat");
  const onChatPage = location.pathname.startsWith("/chat");

  const setActiveChannelId = useCallback((channelId) => {
    activeChannelIdRef.current = channelId;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setChatSoundEnabled(next);
      if (next) {
        unlockChatSound();
        playChatSound();
      }
      return next;
    });
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const result = await requestBrowserPermission();
    setNotificationPermission(result);
    if (result === "granted") {
      setBrowserNotifyEnabled(true);
      setBrowserNotificationsEnabled(true);
    }
    return result;
  }, []);

  const toggleBrowserNotifications = useCallback(async () => {
    if (!browserNotificationsEnabled) {
      const result = await requestNotificationPermission();
      if (result !== "granted") return result;
      setBrowserNotificationsEnabled(true);
      return result;
    }

    setBrowserNotifyEnabled(false);
    setBrowserNotificationsEnabled(false);
    return Notification?.permission || "granted";
  }, [browserNotificationsEnabled, requestNotificationPermission]);

  const refresh = useCallback(async () => {
    if (!chatEnabled) return;
    try {
      const data = await fetchNotificationSummary();
      setSummary(data);

      if (!initializedRef.current) {
        data.channels.forEach((channel) => {
          if (channel.lastMessage?.id) seenMessageIdsRef.current.add(channel.lastMessage.id);
        });
        initializedRef.current = true;
        return;
      }

      const newAlerts = [];
      data.recent.forEach((item) => {
        const msg = item.lastMessage;
        if (!msg?.id || seenMessageIdsRef.current.has(msg.id)) return;
        if (msg.userName === user.name) {
          seenMessageIdsRef.current.add(msg.id);
          return;
        }

        seenMessageIdsRef.current.add(msg.id);
        const isActiveChannel =
          onChatPage && activeChannelIdRef.current === item.channelId;

        if (!isActiveChannel) {
          newAlerts.push({
            id: `${item.channelId}-${msg.id}`,
            channelId: item.channelId,
            channelName: item.channelName,
            userName: msg.userName,
            text: msg.text,
            mentionUnread: item.mentionUnread > 0,
          });
        }
      });

      if (newAlerts.length > 0) {
        setToasts((prev) => [...newAlerts, ...prev].slice(0, 5));

        const hasMention = newAlerts.some((alert) => alert.mentionUnread);
        playChatSound({ mention: hasMention });

        const first = newAlerts[0];
        const title = first.mentionUnread
          ? `${first.userName} mentioned you in ${first.channelName}`
          : `New message in ${first.channelName}`;
        const body = `${first.userName}: ${first.text.slice(0, 120)}`;

        showBrowserNotification({
          title,
          body,
          channelId: first.channelId,
          onClick: () => {
            window.location.href = `/chat?channel=${first.channelId}`;
          },
        });
      }
    } catch {
      // ignore polling errors
    }
  }, [chatEnabled, onChatPage, user?.name]);

  const markRead = useCallback(
    async (channelId, messageId) => {
      if (!chatEnabled) return;
      await markChannelRead(channelId, messageId);
      await refresh();
    },
    [chatEnabled, refresh]
  );

  useEffect(() => {
    if (!chatEnabled) return undefined;

    const unlock = () => {
      unlockChatSound();
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        requestNotificationPermission();
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });

    refresh();
    sendPresenceHeartbeat().catch(() => {});

    const poll = setInterval(refresh, 4000);
    const heartbeat = setInterval(() => sendPresenceHeartbeat().catch(() => {}), 30000);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      clearInterval(poll);
      clearInterval(heartbeat);
    };
  }, [chatEnabled, refresh, requestNotificationPermission]);

  const value = {
    totalUnread: summary.totalUnread,
    totalMentions: summary.totalMentions,
    channels: summary.channels,
    recent: summary.recent,
    toasts,
    dismissToast,
    refresh,
    markRead,
    setActiveChannelId,
    soundEnabled,
    toggleSound,
    browserNotificationsEnabled,
    notificationPermission,
    requestNotificationPermission,
    toggleBrowserNotifications,
  };

  return <ChatNotificationContext.Provider value={value}>{children}</ChatNotificationContext.Provider>;
}

export function useChatNotifications() {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    return {
      totalUnread: 0,
      totalMentions: 0,
      channels: [],
      recent: [],
      toasts: [],
      dismissToast: () => {},
      refresh: async () => {},
      markRead: async () => {},
      setActiveChannelId: () => {},
      soundEnabled: true,
      toggleSound: () => {},
      browserNotificationsEnabled: false,
      notificationPermission: "unsupported",
      requestNotificationPermission: async () => "unsupported",
      toggleBrowserNotifications: async () => "unsupported",
    };
  }
  return context;
}
