import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";

const normalizeNotificationUrl = (url) =>
  typeof url === "string" ? url.replace(/^\/contractor(?=\/|$)/, "/founder") : url;

export const resolveNotificationUrl = (data = {}) => {
  if (!data) return "/founder/home";

  if (data.url) return normalizeNotificationUrl(data.url);
  if (data.link) return normalizeNotificationUrl(data.link);
  if (data.click_action) return normalizeNotificationUrl(data.click_action);

  if (data.type === "chat" && data.projectId) {
    return `/founder/project/${data.projectId}`;
  }
  // Context-based routing fallbacks
  if (data.type === "dpr" || data.reportId) {
    return `/founder/view-report/${data.reportId}`;
  }
  if (data.type === "project" || data.projectId) {
    return `/founder/project/${data.projectId}`;
  }
  if (data.type === "attendance" && data.projectId) {
    return `/founder/projects/${data.projectId}/attendance`;
  }
  if (data.type === "inventory" && data.projectId) {
    return `/founder/projects/${data.projectId}/inventory`;
  }
  if (data.type === "site-engineer-report" && data.projectId) {
    return `/site-engineer/projects/${data.projectId}/report`;
  }
  if (data.type === "site-engineer-project" && data.projectId) {
    return `/site-engineer/projects/${data.projectId}`;
  }

  return "/founder/home";
};

export const onForegroundMessage = (callback) => {
  try {
    return onMessage(messaging, (payload) => {
      if (typeof callback === "function") {
        callback(payload);
      }
    });
  } catch (error) {
    console.error("Error setting up onMessage listener:", error);
    return () => {};
  }
};

export const getFCMToken = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Generating a unique token for this browser
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    // if Firebase fails to generate the token.
    if (!currentToken) {
      console.log("No FCM token available");
      return null;
    }

    return currentToken;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};