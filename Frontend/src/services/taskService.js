import axiosInstance from "../utils/axiosInstance";

export const getTasks = async (projectId, params = {}) => {
  const tasks = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const { data } = await axiosInstance.get("/tasks", {
      params: { projectId, limit: 100, sortBy: "createdAt", sortOrder: "desc", ...params, page },
    });
    tasks.push(...(data.tasks || []));
    hasNextPage = Boolean(data.pagination?.hasNextPage);
    page += 1;
  }
  return tasks;
};

export const getTask = async (taskId) => {
  const { data } = await axiosInstance.get(`/tasks/${taskId}`);
  return data.task;
};

export const createTask = async (task) => {
  const { data } = await axiosInstance.post("/tasks", task);
  return data.task;
};

export const updateTask = async (taskId, changes) => {
  const { data } = await axiosInstance.patch(`/tasks/${taskId}`, changes);
  return data.task;
};

export const deleteTask = async (taskId) => {
  const { data } = await axiosInstance.delete(`/tasks/${taskId}`);
  return data;
};

export const addTaskAssignees = async (taskId, userIds) => {
  const { data } = await axiosInstance.post(`/tasks/${taskId}/assignees`, { userIds });
  return data.task;
};

export const removeTaskAssignee = async (taskId, userId) => {
  const { data } = await axiosInstance.delete(`/tasks/${taskId}/assignees`, { data: { userId } });
  return data.task;
};

export const getTaskProgress = async (taskId, params = {}) => {
  const records = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/progress`, {
      params: { limit: 100, ...params, page },
    });
    records.push(...(data.progressRecords || []));
    hasNextPage = Boolean(data.pagination?.hasNextPage);
    page += 1;
  }
  return records;
};

export const recordTaskProgress = async (taskId, progress) => {
  const { data } = await axiosInstance.post(`/tasks/${taskId}/progress`, progress);
  return data;
};

export const uploadProgressAttachments = async (taskId, progressId, files) => {
  return uploadImages(`/tasks/${taskId}/progress/${progressId}/attachments`, files);
};

export const uploadTaskAttachments = async (taskId, files) => {
  return uploadImages(`/tasks/${taskId}/attachments`, files);
};

export const removeTaskAttachment = async (taskId, attachmentId) => {
  const { data } = await axiosInstance.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  return data;
};

export const getTaskActivity = async (taskId, params = {}) => {
  const activities = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/activity`, {
      params: { limit: 100, ...params, page },
    });
    const activityPage = data.data || {};
    activities.push(...(activityPage.activities || []));
    hasNextPage = Boolean(activityPage.pagination?.hasNextPage);
    page += 1;
  }
  return activities;
};

export const getTaskIssues = async (taskId, params = {}) => {
  const issues = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/issues`, {
      params: { limit: 100, ...params, page },
    });
    issues.push(...(data.issues || []));
    hasNextPage = Boolean(data.pagination?.hasNextPage);
    page += 1;
  }
  return issues;
};

export const getTaskIssue = async (taskId, issueId) => {
  const { data } = await axiosInstance.get(`/tasks/${taskId}/issues/${issueId}`);
  return data.data?.issue || data.issue || data.data;
};

export const createTaskIssue = async (taskId, issue) => {
  const { data } = await axiosInstance.post(`/tasks/${taskId}/issues`, issue);
  return data.issue || data.data?.issue || data.data;
};

export const updateTaskIssue = async (taskId, issueId, changes) => {
  const { data } = await axiosInstance.patch(`/tasks/${taskId}/issues/${issueId}`, changes);
  return data.data?.issue || data.data || data.issue;
};

export const reassignTaskIssue = async (taskId, issueId, assignedTo) => {
  const { data } = await axiosInstance.patch(`/tasks/${taskId}/issues/${issueId}/assign`, { assignedTo });
  return data.data?.issue || data.data || data.issue;
};

export const updateTaskIssueStatus = async (taskId, issueId, status) => {
  const { data } = await axiosInstance.patch(`/tasks/${taskId}/issues/${issueId}/status`, { status });
  return data.data?.issue || data.data || data.issue;
};

export const uploadTaskIssueAttachments = async (taskId, issueId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const { data } = await axiosInstance.post(`/tasks/${taskId}/issues/${issueId}/attachments`, formData);
  return data.data?.attachments || data.attachments || [];
};

export const removeTaskIssueAttachment = async (taskId, issueId, attachmentId) => {
  const { data } = await axiosInstance.delete(`/tasks/${taskId}/issues/${issueId}/attachments/${attachmentId}`);
  return data;
};

const uploadImages = async (endpoint, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const { data } = await axiosInstance.post(endpoint, formData);
  return data.attachments || [];
};

export const getTaskCategories = async () => {
  const { data } = await axiosInstance.get("/task-categories");
  return data.categories || [];
};

export const createTaskCategory = async (category) => {
  const { data } = await axiosInstance.post("/task-categories", category);
  return data.category;
};

export const updateTaskCategory = async (categoryId, changes) => {
  const { data } = await axiosInstance.patch(`/task-categories/${categoryId}`, changes);
  return data.category;
};

export const deleteTaskCategory = async (categoryId) => {
  const { data } = await axiosInstance.delete(`/task-categories/${categoryId}`);
  return data;
};

export const getTaskUnits = async () => {
  const { data } = await axiosInstance.get("/task-units");
  return data.units || [];
};

export const createTaskUnit = async (unit) => {
  const { data } = await axiosInstance.post("/task-units", unit);
  return data.unit;
};

export const updateTaskUnit = async (unitId, changes) => {
  const { data } = await axiosInstance.patch(`/task-units/${unitId}`, changes);
  return data.unit;
};

export const deleteTaskUnit = async (unitId) => {
  const { data } = await axiosInstance.delete(`/task-units/${unitId}`);
  return data;
};
