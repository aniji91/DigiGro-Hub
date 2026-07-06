export const TIMELINE_STATUS_OPTIONS = ["New", "Completed", "Carry forward"];

export const EMPTY_TIMELINE_TASK = {
  id: "",
  activity: "",
  assignee: "",
  tentativeDate: "",
  revisedDate: "",
  completeBy: "",
  status: "New",
  prerequisites: "",
  overdueNote: "",
};

export function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getTimelineTaskDueAt(task) {
  if (task?.completeBy) {
    const date = new Date(task.completeBy);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dateStr = task?.revisedDate || task?.tentativeDate;
  if (!dateStr) return null;
  return new Date(`${dateStr}T23:59:59`);
}

export function isTimelineTaskOverdue(task) {
  if (!task || task.status === "Completed") return false;
  const due = getTimelineTaskDueAt(task);
  if (!due) return false;
  return new Date() > due;
}

export function sortTimelineTasks(tasks = []) {
  return [...tasks].sort((a, b) => {
    const aOverdue = isTimelineTaskOverdue(a);
    const bOverdue = isTimelineTaskOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    const aDue = getTimelineTaskDueAt(a);
    const bDue = getTimelineTaskDueAt(b);
    if (aDue && bDue) return aDue - bDue;
    if (aDue) return -1;
    if (bDue) return 1;
    return (a.activity || "").localeCompare(b.activity || "");
  });
}

export function projectHasOverdueTimeline(tasks = []) {
  return tasks.some((task) => isTimelineTaskOverdue(task));
}

export function nextTimelineTaskId(tasks = []) {
  const nums = tasks.map((task) => Number(String(task.id).replace(/\D/g, "")) || 0);
  return Math.max(0, ...nums, 0) + 1;
}

export function formatTimelineDue(task) {
  const due = getTimelineTaskDueAt(task);
  if (!due) return "";
  return due.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
