const STORAGE_KEY_PREFIX = "project-details-last-tab:";
const VALID_TABS = new Set([
  "Overview",
  "Report",
  "Task",
  "Material",
  "Attendance",
  "Misc Expenses"
]);

const getStorageKey = (projectId, role) => {
  const userId = localStorage.getItem("User_id");
  if (!projectId || !userId) return null;
  return `${STORAGE_KEY_PREFIX}${userId}:${role}:${projectId}`;
};

export const getLastVisitedProjectTab = (projectId, role) => {
  const key = getStorageKey(projectId, role);
  if (!key) return "Overview";
  const savedTab = localStorage.getItem(key);
  return VALID_TABS.has(savedTab) ? savedTab : "Overview";
};

export const saveLastVisitedProjectTab = (projectId, role, tab) => {
  const key = getStorageKey(projectId, role);
  if (key && VALID_TABS.has(tab)) localStorage.setItem(key, tab);
};

export const clearLastVisitedProjectTabs = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
};
