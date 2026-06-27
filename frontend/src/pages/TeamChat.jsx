import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  CornerUpLeft,
  Hash,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChatNotifications } from "../context/ChatNotificationContext";
import { ROLE_COLORS } from "../config/menuConfig";
import { projectsApi } from "../api/crmApi";
import { fetchEmployees } from "../api/employeeApi";
import {
  createChannel,
  createDirectChat,
  deleteChannel,
  fetchChannelUsers,
  fetchChannelMembers,
  fetchChatMembers,
  fetchChannels,
  fetchMessages,
  sendMessage,
} from "../api/chatApi";
import Modal from "../components/Modal";
import ChatComposeTools from "../components/ChatComposeTools";
import ChatMessageBody from "../components/ChatMessageBody";
import { playChatSound } from "../utils/chatSound";

const EMPTY_CHANNEL = {
  type: "project",
  name: "",
  description: "",
  projectId: "",
  isAllEmployees: false,
  memberUserIds: [],
};

const PINNED_KEY = "workhub-pinned-channels";

function formatMessageTime(iso) {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateDivider(iso) {
  return new Date(iso)
    .toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
}

function memberKey(member) {
  return member.userId || `emp-${member.employeeId}`;
}

function channelLabel(channel) {
  return channel?.displayName || channel?.name || "Chat";
}

function replyPreviewText(message) {
  const text = (message.text || "").trim();
  if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  if (message.attachments?.length) return `📎 ${message.attachments[0].name}`;
  if (message.messageType === "gif") return "GIF";
  if (message.messageType === "poll") return message.poll?.question || "Poll";
  if (message.messageType === "drive") return "Google Drive file";
  return "Message";
}

function removeLeadingMention(text, name) {
  const tag = `@${name}`;
  if (text.startsWith(tag)) return text.slice(tag.length).trimStart();
  return text;
}

function loadPinnedIds() {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePinnedIds(ids) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

function buildMessageFeed(messages) {
  const feed = [];
  let lastDate = "";

  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== lastDate) {
      feed.push({ type: "date", key: `date-${dateKey}`, label: formatDateDivider(msg.createdAt) });
      lastDate = dateKey;
    }
    feed.push({ type: "message", key: `msg-${msg.id}`, data: msg });
  });

  return feed;
}

function renderMentionText(text, members) {
  if (!text) return text;

  const nameTags = members.flatMap((m) => {
    const tags = [`@${m.name}`];
    const first = m.name.split(" ")[0];
    if (first && first !== m.name) tags.push(`@${first}`);
    return tags;
  });

  const tags = ["@all", ...nameTags].sort((a, b) => b.length - a.length);

  let nodes = [text];
  tags.forEach((tag) => {
    nodes = nodes.flatMap((node, nodeIndex) => {
      if (typeof node !== "string") return [node];
      const parts = node.split(tag);
      if (parts.length === 1) return [node];
      const result = [];
      parts.forEach((part, i) => {
        if (part) result.push(part);
        if (i < parts.length - 1) {
          result.push(
            <span
              key={`${nodeIndex}-${tag}-${i}`}
              className={tag === "@all" ? "chat-mention-all" : "chat-mention"}
            >
              {tag}
            </span>
          );
        }
      });
      return result;
    });
  });

  return nodes;
}

async function loadAllTeamMembers() {
  try {
    return await fetchChatMembers();
  } catch {
    const employees = await fetchEmployees();
    return employees.map((emp) => ({
      employeeId: emp.id,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      position: emp.position,
      userId: null,
      role: "employee",
      isOnline: false,
    }));
  }
}

function memberMentionedInText(draft, member) {
  const lower = draft.toLowerCase();
  const full = `@${member.name}`.toLowerCase();
  const first = `@${member.name.split(" ")[0]}`.toLowerCase();
  return lower.includes(full) || lower.includes(first);
}

function getActiveMention(draft, cursorPos) {
  const before = draft.slice(0, cursorPos);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1])) return null;

  const query = before.slice(atIndex + 1);
  if (/\n/.test(query)) return null;

  return { atIndex, query };
}

function getMentionSuggestions(members, query, currentUserId) {
  const q = query.toLowerCase();
  const suggestions = [];

  if (!q || "all".startsWith(q)) {
    suggestions.push({
      key: "mention-all",
      type: "all",
      name: "all",
      label: "@all",
      description: "Notify everyone in this channel",
    });
  }

  members.forEach((member) => {
    if (member.userId === currentUserId) return;

    const nameLower = member.name.toLowerCase();
    const first = member.name.split(" ")[0].toLowerCase();
    const matches =
      !q || nameLower.includes(q) || first.startsWith(q) || nameLower.startsWith(q);

    if (matches) {
      suggestions.push({
        key: memberKey(member),
        type: "member",
        member,
        name: member.name,
        label: `@${member.name}`,
        description: member.position || member.department || member.email,
      });
    }
  });

  return suggestions.slice(0, 8);
}

export default function TeamChat() {
  const { user, permissions, roleLabel } = useAuth();
  const { refresh, markRead, setActiveChannelId, totalUnread, totalMentions, soundEnabled, toggleSound, channels: notifyChannels } =
    useChatNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const perms = permissions.chat || {};
  const canCreate = perms.create;

  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState(loadPinnedIds);
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState(EMPTY_CHANNEL);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [mentionSuppressed, setMentionSuppressed] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const attachmentsRef = useRef([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const messagesEndRef = useRef(null);
  const composeRef = useRef(null);
  const channelMessagesInitRef = useRef(false);
  const seenChannelMessageIdsRef = useRef(new Set());
  const activeChannelIdRef = useRef(null);
  const activeChannel = channels.find((c) => c.id === activeId);

  const searchLower = search.trim().toLowerCase();
  const matchesChannelSearch = (c) =>
    !searchLower || channelLabel(c).toLowerCase().includes(searchLower);

  const directChats = channels.filter((c) => c.type === "direct" && matchesChannelSearch(c));
  const groupChannels = channels.filter((c) => c.type !== "direct" && matchesChannelSearch(c));

  const pinnedDirect = directChats.filter((c) => pinnedIds.includes(c.id));
  const openDirect = directChats.filter((c) => !pinnedIds.includes(c.id));
  const pinnedGroups = groupChannels.filter((c) => pinnedIds.includes(c.id));
  const openGroups = groupChannels.filter((c) => !pinnedIds.includes(c.id));

  const allPinned = [...pinnedDirect, ...pinnedGroups];

  const sidebarMembers =
    activeChannel?.type === "direct"
      ? activeChannel.channelMembers || []
      : activeChannel?.channelMembers?.length > 0
        ? activeChannel.channelMembers
        : teamMembers;

  const chatAvailableCount = teamMembers.filter(
    (m) => (m.userId || m.employeeId) && m.userId !== user.id
  ).length;

  const membersSectionTitle = `People (${chatAvailableCount} available for chat)`;

  const directPeer =
    activeChannel?.type === "direct"
      ? sidebarMembers.find((m) => m.userId === activeChannel.peerUserId)
      : null;

  const isDirectChat = activeChannel?.type === "direct";

  const filteredMembers = teamMembers
    .filter(
      (m) =>
        !searchLower ||
        m.name.toLowerCase().includes(searchLower) ||
        (m.department || "").toLowerCase().includes(searchLower) ||
        (m.position || "").toLowerCase().includes(searchLower)
    )
    .sort((a, b) => {
      const aCan = (Boolean(a.userId) || Boolean(a.employeeId)) && a.userId !== user.id;
      const bCan = (Boolean(b.userId) || Boolean(b.employeeId)) && b.userId !== user.id;
      if (aCan !== bCan) return aCan ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const mentionableMembers = sidebarMembers.length > 0 ? sidebarMembers : teamMembers;
  const activeMention = getActiveMention(draft, cursorPos);
  const mentionSuggestions = activeMention
    ? getMentionSuggestions(mentionableMembers, activeMention.query, user.id)
    : [];
  const showMentionPicker = mentionSuggestions.length > 0 && !mentionSuppressed;

  async function loadChannels(selectId) {
    const data = await fetchChannels();
    setChannels(data);
    const paramId = Number(searchParams.get("channel"));
    const nextId = selectId || (paramId && data.some((c) => c.id === paramId) ? paramId : activeId) || data[0]?.id;
    if (nextId) setActiveId(nextId);
    return data;
  }

  async function loadMessages(channelId, markAsRead = true) {
    if (!channelId) return;
    try {
      setError("");
      const data = await fetchMessages(channelId);
      if (Number(activeChannelIdRef.current) !== Number(channelId)) return;

      if (!channelMessagesInitRef.current) {
        data.forEach((m) => seenChannelMessageIdsRef.current.add(m.id));
        channelMessagesInitRef.current = true;
      } else {
        const newcomers = data.filter(
          (m) => !seenChannelMessageIdsRef.current.has(m.id) && m.userName !== user?.name
        );
        newcomers.forEach((m) => seenChannelMessageIdsRef.current.add(m.id));
        if (newcomers.length > 0) {
          const mentioned = newcomers.some(
            (m) =>
              m.mentionAll ||
              (Array.isArray(m.mentionUserIds) && m.mentionUserIds.includes(user?.id))
          );
          playChatSound({ mention: mentioned });
        }
      }

      setMessages(data);

      if (markAsRead && data.length > 0) {
        const last = data[data.length - 1];
        await markRead(channelId, last.id);
        await refresh();
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0, mentionUnread: 0 } : c))
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load messages");
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setError("");
        const members = await loadAllTeamMembers();
        setTeamMembers(members);
        if (members.length === 0) {
          setError("Team members could not be loaded. Please restart the backend server.");
        }
        await loadChannels();

        if (canCreate) {
          const [projectData, userData] = await Promise.all([
            projectsApi.fetchAll().catch(() => []),
            fetchChannelUsers().catch(() => []),
          ]);
          setProjects(projectData);
          setAllUsers(userData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!activeId || !activeChannel) return;
    if (activeChannel.channelMembers?.length > 0) return;

    fetchChannelMembers(activeId)
      .then((members) => {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, channelMembers: members, memberCount: members.length } : c
          )
        );
      })
      .catch(() => {});
  }, [activeId, activeChannel?.id, activeChannel?.channelMembers?.length]);

  useEffect(() => {
    activeChannelIdRef.current = activeId;
    setActiveChannelId(activeId);
    channelMessagesInitRef.current = false;
    seenChannelMessageIdsRef.current = new Set();
    if (!activeId) return undefined;

    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 4000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    if (!notifyChannels?.length || channels.length === 0) return;
    setChannels((prev) =>
      prev.map((channel) => {
        const latest = notifyChannels.find((item) => item.id === channel.id);
        if (!latest) return channel;
        return {
          ...channel,
          unreadCount: latest.unreadCount,
          mentionUnread: latest.mentionUnread,
          lastMessage: latest.lastMessage ?? channel.lastMessage,
        };
      })
    );
  }, [notifyChannels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectChannel(id) {
    setActiveId(id);
    setReplyTo(null);
    setSearchParams(id ? { channel: String(id) } : {});
  }

  function togglePin(channelId, e) {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId];
      savePinnedIds(next);
      return next;
    });
  }

  function toggleMember(userId) {
    setForm((prev) => {
      const ids = prev.memberUserIds || [];
      const next = ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId];
      return { ...prev, memberUserIds: next };
    });
  }

  function selectTeamMember(member) {
    if (!activeChannel) return;
    const key = memberKey(member);
    const isSame = selectedMember && memberKey(selectedMember) === key;

    if (isSame) {
      setSelectedMember(null);
      setDraft((prev) => removeLeadingMention(prev, member.name));
      return;
    }

    setSelectedMember(member);
    const tag = `@${member.name}`;
    setDraft((prev) => {
      let cleaned = prev;
      teamMembers.forEach((m) => {
        cleaned = removeLeadingMention(cleaned, m.name);
      });
      cleaned = cleaned.replace(/^@all\s*/i, "").trimStart();
      if (cleaned.startsWith(tag)) return cleaned;
      return cleaned.trim() ? `${tag} ${cleaned}` : `${tag} `;
    });
    composeRef.current?.focus();
  }

  function insertMentionAll() {
    if (!activeChannel) return;
    setSelectedMember(null);
    setDraft((prev) => {
      let cleaned = prev;
      teamMembers.forEach((m) => {
        cleaned = removeLeadingMention(cleaned, m.name);
      });
      if (/^@all\s*/i.test(cleaned)) return cleaned;
      return cleaned.trim() ? `@all ${cleaned}` : "@all ";
    });
    composeRef.current?.focus();
  }

  function clearSelectedMember() {
    if (!selectedMember) return;
    setDraft((prev) => removeLeadingMention(prev, selectedMember.name));
    setSelectedMember(null);
  }

  function applyMentionSuggestion(suggestion) {
    const textarea = composeRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart ?? cursorPos;
    const mention = getActiveMention(draft, pos);
    if (!mention) return;

    const tag = suggestion.label;
    const before = draft.slice(0, mention.atIndex);
    const after = draft.slice(pos);
    const newDraft = `${before}${tag} ${after}`;
    const newPos = before.length + tag.length + 1;

    setDraft(newDraft);
    setCursorPos(newPos);
    setMentionHighlight(0);
    setMentionSuppressed(false);

    if (suggestion.type === "member") {
      setSelectedMember(suggestion.member);
    } else {
      setSelectedMember(null);
    }

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    setCursorPos(e.target.selectionStart ?? 0);
    setMentionHighlight(0);
    setMentionSuppressed(false);
  }

  function handleComposeKeyDown(e) {
    if (showMentionPicker) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionHighlight((i) => (i + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionHighlight((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMentionSuggestion(mentionSuggestions[mentionHighlight]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionSuppressed(true);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!attachmentLoading) handleSend(e);
    }
  }

  async function startDirectChat(member) {
    if (member.userId === user.id) return;

    try {
      setError("");
      const channel = await createDirectChat({
        userId: member.userId || undefined,
        employeeId: member.employeeId || undefined,
      });
      setChannels((prev) => {
        if (prev.some((c) => c.id === channel.id)) {
          return prev.map((c) => (c.id === channel.id ? channel : c));
        }
        return [...prev, channel];
      });
      selectChannel(channel.id);
      setSelectedMember(null);
      setDraft("");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        type: form.type,
        name: form.name,
        description: form.description,
        projectId: form.type === "project" ? Number(form.projectId) : undefined,
        isAllEmployees: form.type === "common" ? form.isAllEmployees : false,
        memberUserIds: form.type === "common" && !form.isAllEmployees ? form.memberUserIds : [],
      };
      const created = await createChannel(payload);
      setChannels((prev) => [...prev, { ...created, unreadCount: 0, mentionUnread: 0 }]);
      selectChannel(created.id);
      setShowModal(false);
      setForm(EMPTY_CHANNEL);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function clearReply() {
    setReplyTo(null);
  }

  function startReply(message) {
    setReplyTo(message);
    requestAnimationFrame(() => composeRef.current?.focus());
  }

  async function postMessage(payload) {
    const msg = await sendMessage(activeId, payload);
    seenChannelMessageIdsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
    await markRead(activeId, msg.id);
    await refresh();
    await loadMessages(activeId, false);
    return msg;
  }

  async function handleSend(e) {
    e.preventDefault();
    if (attachmentLoading || (!draft.trim() && attachments.length === 0) || !activeId) return;

    try {
      setSending(true);
      setError("");

      const mentionAll = /\B@all\b/i.test(draft);
      const mentionUserIds = [];
      if (selectedMember?.userId) mentionUserIds.push(selectedMember.userId);
      teamMembers.forEach((member) => {
        if (member.userId && memberMentionedInText(draft, member)) {
          mentionUserIds.push(member.userId);
        }
      });

      const pendingAttachments = attachmentsRef.current;
      const hasAttachments = pendingAttachments.length > 0;
      await postMessage({
        text: draft,
        mentionUserIds: [...new Set(mentionUserIds)],
        mentionAll,
        messageType: hasAttachments ? "attachment" : undefined,
        attachments: hasAttachments ? pendingAttachments : undefined,
        replyToMessageId: replyTo?.id,
      });

      setDraft("");
      setSelectedMember(null);
      setAttachments([]);
      setReplyTo(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleInsertPoll(poll) {
    if (!activeId) return;
    try {
      setSending(true);
      setError("");
      await postMessage({ text: poll.question, messageType: "poll", poll });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleInsertGif(gifUrl) {
    if (!activeId) return;
    try {
      setSending(true);
      setError("");
      await postMessage({ text: "", messageType: "gif", gifUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleInsertDriveLink(driveLink) {
    if (!activeId) return;
    try {
      setSending(true);
      setError("");
      await postMessage({ text: "Shared a Google Drive file", messageType: "drive", driveLink });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteChannel() {
    if (!activeChannel || !window.confirm(`Delete channel "${activeChannel.name}"?`)) return;
    try {
      await deleteChannel(activeChannel.id);
      const remaining = channels.filter((c) => c.id !== activeChannel.id);
      setChannels(remaining);
      selectChannel(remaining[0]?.id || null);
      setMessages([]);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function renderChannelButton(channel) {
    const isActive = activeId === channel.id;
    const isPinned = pinnedIds.includes(channel.id);
    const label = channelLabel(channel);

    return (
      <li key={channel.id}>
        <button
          type="button"
          className={`flock-channel-item ${isActive ? "active" : ""} ${channel.unreadCount > 0 ? "unread" : ""} ${channel.type === "direct" ? "direct" : ""}`}
          onClick={() => selectChannel(channel.id)}
        >
          <span className={`flock-channel-icon ${channel.type === "direct" ? "direct" : ""}`}>
            {channel.type === "direct" ? (
              <MessageCircle size={14} />
            ) : channel.type === "project" ? (
              <Hash size={14} />
            ) : (
              <Users size={14} />
            )}
          </span>
          <div className="flock-channel-text">
            <strong>{label}</strong>
            {channel.lastMessage && (
              <span className="flock-channel-preview">
                {channel.lastMessage.userName}: {channel.lastMessage.text}
              </span>
            )}
            {channel.type === "direct" && !channel.lastMessage && (
              <span className="flock-channel-preview">Start a personal conversation</span>
            )}
          </div>
          <div className="flock-channel-meta">
            {channel.unreadCount > 0 && (
              <span className={`flock-unread-badge ${channel.mentionUnread > 0 ? "mention" : ""}`}>
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
            <button
              type="button"
              className={`flock-pin-btn ${isPinned ? "pinned" : ""}`}
              title={isPinned ? "Unpin" : "Pin"}
              onClick={(e) => togglePin(channel.id, e)}
            >
              •
            </button>
          </div>
        </button>
      </li>
    );
  }

  if (loading) return <div className="flock-loading">Loading chat...</div>;

  const messageFeed = buildMessageFeed(messages);

  return (
    <div className="flock-chat">
      {error && <div className="flock-alert error">{error}</div>}

      <aside className="flock-sidebar">
        <div className="flock-user-bar">
          <div className="flock-user-avatar" style={{ background: ROLE_COLORS[user.role] || "#6366f1" }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span className="flock-status">
              <span className="status-dot online" />
              Available · {roleLabel}
            </span>
          </div>
          <button type="button" className="flock-icon-btn" title="Settings">
            <Settings size={16} />
          </button>
        </div>

        <div className="flock-search-bar">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Start a chat or search people"
          />
          {canCreate && (
            <button type="button" className="flock-icon-btn" onClick={() => setShowModal(true)} title="Create channel">
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className="flock-sidebar-scroll">
          {allPinned.length > 0 && (
            <section className="flock-sidebar-group">
              <h4>Pinned Chats and Channels</h4>
              <ul>{allPinned.map(renderChannelButton)}</ul>
            </section>
          )}

          {(openDirect.length > 0 || searchLower) && (
            <section className="flock-sidebar-group">
              <h4>Direct Messages</h4>
              {openDirect.length === 0 ? (
                <p className="flock-empty">No direct chats found.</p>
              ) : (
                <ul>{openDirect.map(renderChannelButton)}</ul>
              )}
            </section>
          )}

          <section className="flock-sidebar-group">
            <h4>Channels</h4>
            {openGroups.length === 0 ? (
              <p className="flock-empty">No channels found.</p>
            ) : (
              <ul>{openGroups.map(renderChannelButton)}</ul>
            )}
          </section>

          <section className="flock-sidebar-group">
            <h4>{membersSectionTitle}</h4>
            <p className="flock-section-hint">Click a colleague to start a direct chat</p>
            {filteredMembers.length === 0 ? (
              <p className="flock-empty">No members found.</p>
            ) : (
              <ul className="flock-people-list">
                {filteredMembers.map((member) => {
                  const isSelf = member.userId === user.id;
                  const canDm = (Boolean(member.userId) || Boolean(member.employeeId)) && !isSelf;
                  const isActiveDm =
                    activeChannel?.type === "direct" && activeChannel.peerUserId === member.userId;

                  return (
                    <li key={memberKey(member)}>
                      <button
                        type="button"
                        className={`flock-person-item ${isActiveDm ? "selected" : ""}`}
                        onClick={() => (canDm ? startDirectChat(member) : undefined)}
                        disabled={isSelf}
                        title={isSelf ? "This is you" : `Direct message ${member.name}`}
                      >
                        <div className="flock-person-avatar-wrap">
                          <div
                            className="flock-person-avatar"
                            style={{ background: ROLE_COLORS[member.role] || "#6366f1" }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          {member.isOnline && <span className="status-dot online person-dot" />}
                        </div>
                        <div>
                          <strong>{member.name}</strong>
                          <span>{member.position || member.department}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </aside>

      <section className="flock-main">
        {activeChannel ? (
          <>
            <header className="flock-main-header">
              <div>
                <h2 className={isDirectChat ? "direct-title" : ""}>{channelLabel(activeChannel)}</h2>
                <p>
                  {isDirectChat ? (
                    <>
                      <span className={`status-dot ${directPeer?.isOnline ? "online" : ""}`} />
                      {directPeer?.isOnline ? "Online" : "Offline"}
                      {directPeer?.position ? ` · ${directPeer.position}` : directPeer?.department ? ` · ${directPeer.department}` : ""}
                      {" · Direct message"}
                    </>
                  ) : (
                    <>
                      {activeChannel.memberCount ?? activeChannel.channelMembers?.length ?? sidebarMembers.length ?? 0} members
                      {activeChannel.type === "project" && activeChannel.projectName
                        ? ` · ${activeChannel.projectName}`
                        : ""}
                    </>
                  )}
                </p>
              </div>
              <div className="flock-header-actions">
                <button
                  type="button"
                  className={`flock-icon-btn ${soundEnabled ? "" : "muted"}`}
                  onClick={toggleSound}
                  title={soundEnabled ? "Mute chat sounds" : "Enable chat sounds"}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                {totalUnread > 0 && (
                  <span className="flock-header-bell" title={`${totalUnread} unread messages`}>
                    <Bell size={18} />
                    <span className="flock-unread-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
                  </span>
                )}
                {totalMentions > 0 && (
                  <span className="flock-mention-pill">@{totalMentions} mentions</span>
                )}
                {canCreate && activeChannel.type === "project" && (
                  <button type="button" className="flock-icon-btn danger" onClick={handleDeleteChannel} title="Delete channel">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </header>

            <div className="flock-messages">
              {messages.length === 0 ? (
                <p className="flock-empty-center">No messages yet. Say hello to the team!</p>
              ) : (
                messageFeed.map((item) => {
                  if (item.type === "date") {
                    return (
                      <div key={item.key} className="flock-date-divider">
                        <span>{item.label}</span>
                      </div>
                    );
                  }

                  const msg = item.data;
                  const isMentioned =
                    msg.mentionAll || (msg.mentionUserIds || []).includes(user.id);

                  return (
                    <article
                      key={item.key}
                      className={`flock-message ${isMentioned ? "mentioned" : ""}`}
                    >
                      <div
                        className="flock-message-avatar"
                        style={{ background: ROLE_COLORS[msg.userRole] || "#6366f1" }}
                      >
                        {msg.userName?.charAt(0) || "?"}
                      </div>
                      <div className="flock-message-content">
                        <div className="flock-message-actions">
                          <button
                            type="button"
                            className="flock-message-action-btn"
                            title="Reply"
                            onClick={() => startReply(msg)}
                          >
                            <CornerUpLeft size={15} />
                          </button>
                        </div>
                        <div className="flock-message-top">
                          <strong>{msg.userName || "Unknown"}</strong>
                          {isMentioned && <span className="mention-badge">mentioned you</span>}
                          <span className="flock-message-time">{formatMessageTime(msg.createdAt)}</span>
                        </div>
                        <ChatMessageBody
                          message={msg}
                          mentionNodes={renderMentionText(msg.text, sidebarMembers.length ? sidebarMembers : teamMembers)}
                        />
                      </div>
                    </article>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="flock-compose" onSubmit={handleSend}>
              {replyTo && (
                <div className="reply-compose-chip">
                  <span>
                    Replying to <strong>{replyTo.userName}</strong>
                    <em>{replyPreviewText(replyTo)}</em>
                  </span>
                  <button type="button" className="flock-icon-btn" onClick={clearReply} aria-label="Cancel reply">
                    <X size={14} />
                  </button>
                </div>
              )}
              {selectedMember && !isDirectChat && (
                <div className="mention-compose-chip">
                  <span>
                    Messaging <strong>@{selectedMember.name}</strong> in {channelLabel(activeChannel)}
                  </span>
                  <button type="button" className="flock-icon-btn" onClick={clearSelectedMember}>
                    <X size={14} />
                  </button>
                </div>
              )}
              {!isDirectChat && (
                <div className="flock-compose-toolbar">
                  <button type="button" className="flock-mention-all-btn" onClick={insertMentionAll}>
                    @all
                  </button>
                  <span className="flock-compose-hint">Type @ to mention someone in this channel</span>
                </div>
              )}
              <div className="flock-compose-row">
                <ChatComposeTools
                  draft={draft}
                  setDraft={setDraft}
                  composeRef={composeRef}
                  onDraftChange={handleDraftChange}
                  onKeyDown={handleComposeKeyDown}
                  placeholder={`Message ${channelLabel(activeChannel)}`}
                  disabled={sending || attachmentLoading}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  attachmentLoading={attachmentLoading}
                  onAttachmentLoadingChange={setAttachmentLoading}
                  onInsertPoll={handleInsertPoll}
                  onInsertGif={handleInsertGif}
                  onInsertDriveLink={handleInsertDriveLink}
                  mentionPicker={
                    showMentionPicker ? (
                      <ul className="mention-picker" role="listbox">
                        {mentionSuggestions.map((suggestion, index) => (
                          <li key={suggestion.key} role="option" aria-selected={index === mentionHighlight}>
                            <button
                              type="button"
                              className={`mention-picker-item ${index === mentionHighlight ? "active" : ""} ${suggestion.type === "all" ? "all" : ""}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyMentionSuggestion(suggestion)}
                            >
                              {suggestion.type === "member" ? (
                                <span
                                  className="mention-picker-avatar"
                                  style={{ background: ROLE_COLORS[suggestion.member.role] || "#6366f1" }}
                                >
                                  {suggestion.name.charAt(0)}
                                </span>
                              ) : (
                                <span className="mention-picker-avatar all">@</span>
                              )}
                              <span className="mention-picker-text">
                                <strong>{suggestion.label}</strong>
                                <small>{suggestion.description}</small>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null
                  }
                />
                <button
                  type="submit"
                  className="flock-send-btn"
                  disabled={sending || attachmentLoading || (!draft.trim() && attachments.length === 0)}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flock-placeholder">
            <Lock size={40} />
            <h3>Select a channel</h3>
            <p>Choose a channel from the left to start chatting with your team</p>
          </div>
        )}
      </section>

      {showModal && (
        <Modal title="Create Channel" onClose={() => setShowModal(false)} wide>
          <form className="modal-form-layout" onSubmit={handleCreateChannel}>
            <div className="modal-form-fields">
              <label>
                Channel Type
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...EMPTY_CHANNEL, type: e.target.value })}
                >
                  <option value="project">Project Channel</option>
                  <option value="common">Common Channel</option>
                </select>
              </label>
              <label>
                Channel Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>
                Description
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              {form.type === "project" && (
                <label>
                  Project
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    required
                  >
                    <option value="">Select project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>
                    ))}
                  </select>
                </label>
              )}
              {form.type === "common" && (
                <>
                  <label className="assign-chip">
                    <input
                      type="checkbox"
                      checked={form.isAllEmployees}
                      onChange={(e) => setForm({ ...form, isAllEmployees: e.target.checked, memberUserIds: [] })}
                    />
                    Open to all employees
                  </label>
                  {!form.isAllEmployees && (
                    <div className="assign-section">
                      <span className="field-label">Select members</span>
                      <div className="assign-grid">
                        {allUsers.map((u) => (
                          <label key={u.id} className="assign-chip">
                            <input
                              type="checkbox"
                              checked={form.memberUserIds.includes(u.id)}
                              onChange={() => toggleMember(u.id)}
                            />
                            {u.name} <small>({u.role})</small>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create Channel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
