importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB5o_fMwe4zx5JW75lTSXLH58_0pA4Mdv8",
  authDomain: "odraopssaas.firebaseapp.com",
  projectId: "odraopssaas",
  storageBucket: "odraopssaas.firebasestorage.app",
  messagingSenderId: "1058597575369",
  appId: "1:1058597575369:web:b4bf6e1cf0c1d041524b18",
});

const messaging = firebase.messaging();

function normalizeNotificationUrl(url) {
  return typeof url === "string" ? url.replace(/^\/contractor(?=\/|$)/, "/founder") : url;
}

function resolveTargetUrl(data) {
  if (!data) return "/founder/home";
  if (data.url) return normalizeNotificationUrl(data.url);
  if (data.link) return normalizeNotificationUrl(data.link);
  if (data.click_action) return normalizeNotificationUrl(data.click_action);

  // Context-based fallback routing based on payload fields
  if (data.type === "chat" && data.projectId) {
    return `/founder/project/${data.projectId}`;
  }
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
}

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "ODRAOPS";
  const body = payload.notification?.body || payload.data?.body || "";
  const icon = payload.notification?.icon || "/icon/icon-192x192.png";
  const targetPath = resolveTargetUrl(payload.data);

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/icon/icon-192x192.png",
    data: {
      ...(payload.data || {}),
      url: targetPath,
    },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetPath = normalizeNotificationUrl(data.url) || resolveTargetUrl(data);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Find an existing window/tab under this origin
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then((focusedClient) => {
            // Post message so React Router can handle routing without reload if mounted
            focusedClient.postMessage({
              type: "NOTIFICATION_CLICK",
              url: targetPath,
              fullUrl: targetUrl,
              data: data,
            });

            // If the client is not already on the target URL, navigate to it
            if ("navigate" in focusedClient && focusedClient.url !== targetUrl) {
              return focusedClient.navigate(targetUrl);
            }
            return focusedClient;
          });
        }
      }

      // If no open client exists, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});