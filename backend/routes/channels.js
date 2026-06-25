const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readData, writeData, dataPath, nextId } = require("../utils/jsonStore");
const { ensureEmployeeUser, syncAllEmployeeUsers } = require("../utils/employeeUsers");

const router = express.Router();
const CHANNELS_FILE = dataPath("channels.json");
const MESSAGES_FILE = dataPath("messages.json");
const PROJECTS_FILE = dataPath("projects.json");
const USERS_FILE = dataPath("users.json");
const EMPLOYEES_FILE = dataPath("employees.json");
const READS_FILE = dataPath("channel_reads.json");
const PRESENCE_FILE = dataPath("user_presence.json");

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function readChannels() {
  return readData(CHANNELS_FILE);
}

function writeChannels(channels) {
  writeData(CHANNELS_FILE, channels);
}

function readMessages() {
  return readData(MESSAGES_FILE);
}

function writeMessages(messages) {
  writeData(MESSAGES_FILE, messages);
}

function readUsers() {
  return readData(USERS_FILE);
}

function readEmployees() {
  return readData(EMPLOYEES_FILE);
}

function readProjects() {
  return readData(PROJECTS_FILE);
}

function readReads() {
  return readData(READS_FILE);
}

function writeReads(reads) {
  writeData(READS_FILE, reads);
}

function readPresence() {
  return readData(PRESENCE_FILE);
}

function writePresence(presence) {
  writeData(PRESENCE_FILE, presence);
}

function userCanAccessChannel(user, channel) {
  if (channel.type === "direct") {
    const ids = channel.dmUserIds || channel.memberUserIds || [];
    return ids.includes(user.id);
  }
  if (user.role === "superadmin") return true;
  if (channel.isAllEmployees) return true;
  if (channel.memberUserIds.includes(user.id)) return true;

  if (channel.type === "project" && channel.projectId && user.employeeId) {
    const projects = readProjects();
    const project = projects.find((p) => p.id === channel.projectId);
    if (project && (project.assignedEmployeeIds || []).includes(user.employeeId)) {
      return true;
    }
  }

  return false;
}

function getChannelMemberUserIds(channel) {
  return readUsers()
    .filter((u) => userCanAccessChannel(u, channel))
    .map((u) => u.id);
}

function resolveProjectMembers(projectId) {
  const projects = readProjects();
  const users = readUsers();
  const project = projects.find((p) => p.id === Number(projectId));
  if (!project) return [];

  const memberIds = new Set();
  users.forEach((u) => {
    if (u.employeeId && (project.assignedEmployeeIds || []).includes(u.employeeId)) {
      memberIds.add(u.id);
    }
  });
  return [...memberIds];
}

function getLastRead(userId, channelId) {
  return readReads().find((r) => r.userId === userId && r.channelId === channelId);
}

function markChannelRead(userId, channelId, messageId) {
  const reads = readReads();
  const index = reads.findIndex((r) => r.userId === userId && r.channelId === channelId);
  const entry = {
    userId,
    channelId: Number(channelId),
    lastReadAt: new Date().toISOString(),
    lastReadMessageId: messageId ? Number(messageId) : null,
  };
  if (index >= 0) reads[index] = entry;
  else reads.push(entry);
  writeReads(reads);
  return entry;
}

function buildReplySnapshot(messages, channelId, replyToMessageId) {
  if (!replyToMessageId) return null;
  const original = messages.find((m) => m.id === Number(replyToMessageId));
  if (!original || original.channelId !== Number(channelId)) return null;

  let previewText = (original.text || "").trim();
  if (!previewText) {
    if (original.attachments?.length) previewText = `📎 ${original.attachments[0].name}`;
    else if (original.messageType === "gif") previewText = "GIF";
    else if (original.messageType === "poll") previewText = original.poll?.question || "Poll";
    else if (original.messageType === "drive") previewText = "Google Drive file";
    else previewText = "Message";
  }
  if (previewText.length > 200) previewText = `${previewText.slice(0, 200)}…`;

  return {
    id: original.id,
    userId: original.userId,
    userName: original.userName,
    text: previewText,
    messageType: original.messageType || "text",
  };
}

function getUnreadMessagesForUser(user, channel, allMessages) {
  const lastRead = getLastRead(user.id, channel.id);
  const cutoff = lastRead?.lastReadAt ? new Date(lastRead.lastReadAt) : new Date(0);

  return allMessages.filter(
    (m) =>
      m.channelId === channel.id &&
      m.userId !== user.id &&
      new Date(m.createdAt) > cutoff
  );
}

function isMessageMentioningUser(message, userId) {
  if (message.mentionAll) return true;
  return (message.mentionUserIds || []).includes(userId);
}

function getDirectPeerId(channel, userId) {
  const ids = channel.dmUserIds || channel.memberUserIds || [];
  return ids.find((id) => id !== userId) || null;
}

function getDirectDisplayName(channel, userId) {
  const peerId = getDirectPeerId(channel, userId);
  if (!peerId) return channel.name || "Direct Chat";
  const peer = readUsers().find((u) => u.id === peerId);
  return peer?.name || channel.name || "Direct Chat";
}

function findDirectChannel(channels, userIdA, userIdB) {
  const pair = [userIdA, userIdB].sort((a, b) => a - b);
  return channels.find(
    (c) =>
      c.type === "direct" &&
      c.dmUserIds?.length === 2 &&
      c.dmUserIds[0] === pair[0] &&
      c.dmUserIds[1] === pair[1]
  );
}

function enrichChannel(channel, user, allMessages) {
  const channelMessages = allMessages
    .filter((m) => m.channelId === channel.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const unread = getUnreadMessagesForUser(user, channel, allMessages);
  const lastMessage = channelMessages[channelMessages.length - 1] || null;
  const mentionUnread = unread.filter((m) => isMessageMentioningUser(m, user.id)).length;
  const channelMembers = getChannelMembers(channel);
  const displayName =
    channel.type === "direct" ? getDirectDisplayName(channel, user.id) : channel.name;
  const peerUserId = channel.type === "direct" ? getDirectPeerId(channel, user.id) : null;

  return {
    ...channel,
    displayName,
    peerUserId,
    isDirect: channel.type === "direct",
    unreadCount: unread.length,
    mentionUnread,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          text: lastMessage.text,
          userName: lastMessage.userName,
          createdAt: lastMessage.createdAt,
        }
      : null,
    memberCount: channelMembers.length,
    channelMembers,
  };
}

function touchPresence(userId) {
  const presence = readPresence();
  const index = presence.findIndex((p) => p.userId === userId);
  const entry = { userId, lastSeenAt: new Date().toISOString() };
  if (index >= 0) presence[index] = entry;
  else presence.push(entry);
  writePresence(presence);
  return entry;
}

function isUserOnline(userId) {
  const entry = readPresence().find((p) => p.userId === userId);
  if (!entry) return false;
  return Date.now() - new Date(entry.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

function mapEmployeeToMember(emp, users) {
  const linked = users.find((u) => u.employeeId === emp.id);
  return {
    employeeId: emp.id,
    name: emp.name,
    email: emp.email,
    department: emp.department,
    position: emp.position,
    userId: linked?.id || null,
    role: linked?.role || "employee",
    isOnline: linked ? isUserOnline(linked.id) : false,
  };
}

function getAllTeamMembers() {
  const employees = readEmployees();
  const users = readUsers();
  const members = employees.map((emp) => mapEmployeeToMember(emp, users));

  users.forEach((u) => {
    if (u.employeeId) return;
    if (members.some((m) => m.userId === u.id)) return;
    members.push({
      employeeId: null,
      name: u.name,
      email: null,
      department: u.role.replace("_", " "),
      position: null,
      userId: u.id,
      role: u.role,
      isOnline: isUserOnline(u.id),
    });
  });

  return members.sort((a, b) => a.name.localeCompare(b.name));
}

function getChannelMembers(channel) {
  const employees = readEmployees();
  const users = readUsers();

  if (channel.type === "direct") {
    const ids = channel.dmUserIds || channel.memberUserIds || [];
    return ids
      .map((userId) => {
        const u = users.find((x) => x.id === userId);
        if (!u) return null;
        if (u.employeeId) {
          const emp = employees.find((e) => e.id === u.employeeId);
          if (emp) return mapEmployeeToMember(emp, users);
        }
        return {
          employeeId: null,
          name: u.name,
          email: null,
          department: u.role.replace("_", " "),
          position: null,
          userId: u.id,
          role: u.role,
          isOnline: isUserOnline(u.id),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (channel.type === "project" && channel.projectId) {
    const project = readProjects().find((p) => p.id === channel.projectId);
    return (project?.assignedEmployeeIds || [])
      .map((employeeId) => employees.find((e) => e.id === employeeId))
      .filter(Boolean)
      .map((emp) => mapEmployeeToMember(emp, users))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (channel.isAllEmployees) {
    return employees.map((emp) => mapEmployeeToMember(emp, users)).sort((a, b) => a.name.localeCompare(b.name));
  }

  const memberUsers = users.filter(
    (u) => channel.memberUserIds.includes(u.id) || u.role === "superadmin"
  );

  return memberUsers
    .map((u) => {
      if (u.employeeId) {
        const emp = employees.find((e) => e.id === u.employeeId);
        if (emp) return mapEmployeeToMember(emp, users);
      }
      return {
        employeeId: null,
        name: u.name,
        email: null,
        department: u.role.replace("_", " "),
        position: null,
        userId: u.id,
        role: u.role,
        isOnline: isUserOnline(u.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

router.use(authenticate);

router.post("/presence", (req, res) => {
  const entry = touchPresence(req.user.id);
  res.json({ userId: entry.userId, lastSeenAt: entry.lastSeenAt, isOnline: true });
});

router.get("/notifications/summary", (req, res) => {
  touchPresence(req.user.id);
  const allMessages = readMessages();
  const channels = readChannels()
    .filter((c) => userCanAccessChannel(req.user, c))
    .map((c) => enrichChannel(c, req.user, allMessages));

  const totalUnread = channels.reduce((sum, c) => sum + c.unreadCount, 0);
  const totalMentions = channels.reduce((sum, c) => sum + c.mentionUnread, 0);

  const recent = channels
    .filter((c) => c.unreadCount > 0)
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : 0;
      return bTime - aTime;
    })
    .slice(0, 10)
    .map((c) => ({
      channelId: c.id,
      channelName: c.name,
      unreadCount: c.unreadCount,
      mentionUnread: c.mentionUnread,
      lastMessage: c.lastMessage,
    }));

  res.json({ totalUnread, totalMentions, channels, recent });
});

router.get("/meta/users", (req, res) => {
  if (!["superadmin", "product_manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const users = readUsers().map(({ passwordHash, ...user }) => user);
  res.json(users);
});

router.get("/meta/members", async (req, res) => {
  touchPresence(req.user.id);
  await syncAllEmployeeUsers(readEmployees());
  res.json(getAllTeamMembers());
});

router.get("/:id/members", (req, res) => {
  const channels = readChannels();
  const channel = channels.find((c) => c.id === Number(req.params.id));

  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!userCanAccessChannel(req.user, channel)) {
    return res.status(403).json({ error: "You do not have access to this channel" });
  }

  res.json(getChannelMembers(channel));
});

router.get("/", (req, res) => {
  touchPresence(req.user.id);
  const allMessages = readMessages();
  const channels = readChannels()
    .filter((c) => userCanAccessChannel(req.user, c))
    .map((c) => enrichChannel(c, req.user, allMessages));
  res.json(channels);
});

router.post("/direct", async (req, res) => {
  let targetUserId = Number(req.body.userId);
  const employeeId = Number(req.body.employeeId);

  if (!targetUserId && employeeId) {
    const employee = readEmployees().find((e) => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const linked = await ensureEmployeeUser(employee);
    targetUserId = linked.id;
  }

  if (!targetUserId) {
    return res.status(400).json({ error: "User or employee is required to start a direct chat" });
  }
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: "You cannot start a chat with yourself" });
  }

  const users = readUsers();
  const target = users.find((u) => u.id === targetUserId);
  if (!target) {
    return res.status(404).json({ error: "User not found or cannot receive direct messages" });
  }

  const channels = readChannels();
  const existing = findDirectChannel(channels, req.user.id, targetUserId);
  const allMessages = readMessages();

  if (existing) {
    return res.json(enrichChannel(existing, req.user, allMessages));
  }

  const pair = [req.user.id, targetUserId].sort((a, b) => a - b);
  const newChannel = {
    id: nextId(channels),
    type: "direct",
    name: target.name,
    description: "",
    projectId: null,
    projectName: null,
    dmUserIds: pair,
    memberUserIds: pair,
    isAllEmployees: false,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };

  channels.push(newChannel);
  writeChannels(channels);
  res.status(201).json(enrichChannel(newChannel, req.user, allMessages));
});

router.post("/", (req, res) => {
  if (!["superadmin", "product_manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only Product Manager or Super Admin can create channels" });
  }

  const { type, name, description, projectId, memberUserIds, isAllEmployees } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: "Channel type and name are required" });
  }

  if (!["project", "common"].includes(type)) {
    return res.status(400).json({ error: "Invalid channel type" });
  }

  const channels = readChannels();
  let members = [];
  let projectName = null;

  if (type === "project") {
    if (!projectId) {
      return res.status(400).json({ error: "Project is required for project channels" });
    }
    const project = readProjects().find((p) => p.id === Number(projectId));
    if (!project) return res.status(404).json({ error: "Project not found" });

    projectName = project.name;
    members = resolveProjectMembers(projectId);
    members.push(req.user.id);
    members = [...new Set(members)];
  } else {
    if (isAllEmployees) {
      members = [];
    } else {
      members = (memberUserIds || []).map(Number);
      members.push(req.user.id);
      members = [...new Set(members)];
      if (members.length <= 1) {
        return res.status(400).json({ error: "Select at least one member for the channel" });
      }
    }
  }

  const newChannel = {
    id: nextId(channels),
    type,
    name,
    description: description || "",
    projectId: type === "project" ? Number(projectId) : null,
    projectName,
    memberUserIds: members,
    isAllEmployees: type === "common" ? Boolean(isAllEmployees) : false,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };

  channels.push(newChannel);
  writeChannels(channels);
  res.status(201).json(newChannel);
});

router.post("/:id/read", (req, res) => {
  const channels = readChannels();
  const channel = channels.find((c) => c.id === Number(req.params.id));

  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!userCanAccessChannel(req.user, channel)) {
    return res.status(403).json({ error: "You do not have access to this channel" });
  }

  const { messageId } = req.body || {};
  const entry = markChannelRead(req.user.id, channel.id, messageId);
  res.json(entry);
});

router.get("/:id/messages", (req, res) => {
  const channels = readChannels();
  const channel = channels.find((c) => c.id === Number(req.params.id));

  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!userCanAccessChannel(req.user, channel)) {
    return res.status(403).json({ error: "You do not have access to this channel" });
  }

  const messages = readMessages()
    .filter((m) => m.channelId === channel.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json(messages);
});

router.post("/:id/messages", (req, res) => {
  const {
    text,
    mentionUserIds,
    mentionAll,
    messageType,
    attachments,
    poll,
    gifUrl,
    driveLink,
    replyToMessageId,
  } = req.body;

  const messageText = (text || "").trim();
  const hasAttachment = Array.isArray(attachments) && attachments.length > 0;
  const hasPoll = messageType === "poll" && poll?.question;
  const hasGif = messageType === "gif" && gifUrl;
  const hasDrive = messageType === "drive" && driveLink;

  if (!messageText && !hasAttachment && !hasPoll && !hasGif && !hasDrive) {
    return res.status(400).json({ error: "Message content is required" });
  }

  const channels = readChannels();
  const channel = channels.find((c) => c.id === Number(req.params.id));

  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!userCanAccessChannel(req.user, channel)) {
    return res.status(403).json({ error: "You do not have access to this channel" });
  }

  const isAllMention =
    channel.type !== "direct" &&
    messageText &&
    (Boolean(mentionAll) || /\B@all\b/i.test(messageText));
  let mentions = [...new Set((mentionUserIds || []).map(Number).filter(Boolean))];

  if (isAllMention) {
    mentions = getChannelMemberUserIds(channel).filter((id) => id !== req.user.id);
  }

  const messages = readMessages();
  const newMessage = {
    id: nextId(messages),
    channelId: channel.id,
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    text: messageText,
    messageType: hasAttachment ? "attachment" : messageType || "text",
    mentionUserIds: mentions,
    mentionAll: isAllMention,
    createdAt: new Date().toISOString(),
  };

  if (hasAttachment) {
    newMessage.attachments = attachments.map((a) => ({
      name: a.name,
      mimeType: a.mimeType,
      dataUrl: a.dataUrl,
    }));
  }
  if (hasPoll) {
    newMessage.poll = {
      question: poll.question,
      options: poll.options,
      votes: {},
    };
  }
  if (hasGif) newMessage.gifUrl = gifUrl;
  if (hasDrive) newMessage.driveLink = driveLink;

  const replyTo = buildReplySnapshot(messages, channel.id, replyToMessageId);
  if (replyTo) {
    newMessage.replyToMessageId = replyTo.id;
    newMessage.replyTo = replyTo;
  }

  messages.push(newMessage);
  writeMessages(messages);
  res.status(201).json(newMessage);
});

router.delete("/:id", (req, res) => {
  if (!["superadmin", "product_manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const channels = readChannels();
  const index = channels.findIndex((c) => c.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Channel not found" });

  const deleted = channels.splice(index, 1)[0];
  writeChannels(channels);

  const messages = readMessages().filter((m) => m.channelId !== deleted.id);
  writeMessages(messages);

  const reads = readReads().filter((r) => r.channelId !== deleted.id);
  writeReads(reads);

  res.json(deleted);
});

module.exports = router;
