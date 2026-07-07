export function isVisibleTask(update) {
  if (!update || update.type !== "status") return true;
  return !update.isHidden;
}

export function filterVisibleTasks(updates = []) {
  return updates.filter(isVisibleTask);
}
