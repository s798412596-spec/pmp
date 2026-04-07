// ─── In-App Notification System ───────────────────────────────────────────────

const NOTIF_KEY = "sm-ops-notifications";
const NOTIF_READ_KEY = "sm-ops-notif-read";

export function getStoredNotifications() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); }
  catch { return []; }
}

export function getReadIds() {
  try { return JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || "[]"); }
  catch { return []; }
}

export function markAsRead(ids) {
  const read = getReadIds();
  const merged = [...new Set([...read, ...ids])];
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(merged.slice(-200)));
}

export function markAllRead() {
  const all = getStoredNotifications().map(n => n.id);
  markAsRead(all);
}

export function clearNotifications() {
  localStorage.setItem(NOTIF_KEY, "[]");
}

export function generateNotifications(data, userId) {
  const { projects } = data;
  const notifications = [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().slice(0, 10);

  const allActions = [];
  (projects || []).forEach(p =>
    (p.categories || []).forEach(c =>
      (c.resources || []).forEach(r =>
        (r.actions || []).forEach(a =>
          allActions.push({ ...a, projectName: p.name })
        )
      )
    )
  );

  const myActions = userId
    ? allActions.filter(a => a.staffId === userId)
    : allActions;

  myActions.forEach(a => {
    if (a.progress === 2 || !a.deadline || a.aType !== "once") return;
    const d = new Date(a.deadline); d.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d - now) / 86400000);

    if (diff < 0) {
      notifications.push({
        id: `overdue-${a.id}-${todayStr}`,
        type: "overdue", level: "danger",
        title: `逾期${Math.abs(diff)}天`,
        body: `「${a.name}」已逾期，请尽快处理`,
        project: a.projectName, actionId: a.id, time: todayStr,
        priority: Math.abs(diff),
      });
    } else if (diff === 0) {
      notifications.push({
        id: `today-${a.id}-${todayStr}`,
        type: "due_today", level: "warning",
        title: "今日截止",
        body: `「${a.name}」今天到期`,
        project: a.projectName, actionId: a.id, time: todayStr,
        priority: 100,
      });
    } else if (diff <= 3) {
      notifications.push({
        id: `soon-${a.id}-${todayStr}`,
        type: "due_soon", level: "info",
        title: `${diff}天后截止`,
        body: `「${a.name}」即将到期`,
        project: a.projectName, actionId: a.id, time: todayStr,
        priority: 200 + diff,
      });
    }
  });

  (projects || []).forEach(p => {
    (p.milestones || []).forEach(m => {
      if (m.status === 2 || !m.date) return;
      const d = new Date(m.date); d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d - now) / 86400000);
      if (diff >= 0 && diff <= 7) {
        notifications.push({
          id: `milestone-${m.id}-${todayStr}`,
          type: "milestone", level: diff <= 1 ? "warning" : "info",
          title: diff === 0 ? "里程碑今日到期" : `里程碑${diff}天后`,
          body: `「${p.name}」- ${m.name}`,
          project: p.name, time: todayStr,
          priority: 50 + diff,
        });
      }
    });
  });

  notifications.sort((a, b) => a.priority - b.priority);
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); } catch {}
  return notifications;
}
