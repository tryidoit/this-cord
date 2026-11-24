// Web Notifications API — works on ChromeOS, Chrome, Edge, and any browser
// that supports the Notifications API. Notifications appear in the system
// notification center (including ChromeOS's), even when the tab is in the
// background or the window is minimized.

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function showNotification(title, options = {}) {
  if (!notificationsSupported() || Notification.permission !== "granted") return null;
  try {
    const notif = new Notification(title, {
      body: options.body || "",
      icon: options.icon || "/favicon.ico",
      tag: options.tag,
      badge: options.badge,
      silent: options.silent || false,
      requireInteraction: options.requireInteraction || false,
    });
    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick();
        notif.close();
      };
    }
    if (!options.requireInteraction) {
      setTimeout(() => notif.close(), 6000);
    }
    return notif;
  } catch {
    return null;
  }
}