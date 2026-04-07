// ─── Data Export Helpers ──────────────────────────────────────────────────────

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getAllActionsFlat(projects) {
  const rows = [];
  (projects || []).forEach(p =>
    (p.categories || []).forEach(c =>
      (c.resources || []).forEach(r =>
        (r.actions || []).forEach(a =>
          rows.push({ ...a, projectName: p.name, categoryName: c.name, resourceName: r.name })
        )
      )
    )
  );
  return rows;
}

export function exportToCSV(data, staff) {
  const { projects } = data;
  const staffMap = Object.fromEntries((staff || []).map(s => [s.id, s.name]));
  const actions = getAllActionsFlat(projects);
  const headers = ["项目", "类别", "资源", "动作", "类型", "负责人", "截止日期", "工时", "进度", "备注"];
  const progressLabel = v => v === 2 ? "已完成" : v === 1 ? "进行中" : "未开始";
  const rows = actions.map(a => [
    a.projectName, a.categoryName, a.resourceName, a.name,
    a.aType === "once" ? "一次性" : "周期性",
    staffMap[a.staffId] || "",
    a.deadline || "",
    a.hours || "",
    progressLabel(a.progress),
    a.note || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload("\uFEFF" + csv, `任务导出_${date}.csv`, "text/csv;charset=utf-8");
}

export function exportStaffCSV(staff, projects) {
  const actions = getAllActionsFlat(projects || []);
  const headers = ["姓名", "角色", "职位", "手机", "总任务", "已完成", "完成率%"];
  const rows = (staff || []).map(s => {
    const mine = actions.filter(a => a.staffId === s.id);
    const done = mine.filter(a => a.progress === 2).length;
    return [
      s.name, s.role, s.position || "", s.phone || "",
      mine.length, done,
      mine.length ? Math.round(done / mine.length * 100) : 0,
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload("\uFEFF" + csv, `员工导出_${date}.csv`, "text/csv;charset=utf-8");
}

export function exportFullBackup(data) {
  const backup = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    data,
  };
  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(json, `完整备份_${date}.json`, "application/json");
}

// ─── localStorage Auto-Backup ─────────────────────────────────────────────────

const BACKUP_KEY = "sm-auto-backups";
const MAX_BACKUPS = 5;

export function autoBackupToLocalStorage(data) {
  try {
    const existing = getBackupHistory();
    const entry = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      projectCount: (data.projects || []).length,
      staffCount: (data.staff || []).length,
      snapshot: data,
    };
    const updated = [entry, ...existing].slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("autoBackup failed:", e.message);
  }
}

export function getBackupHistory() {
  try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"); }
  catch { return []; }
}

export function restoreFromBackup(backupEntry) {
  return backupEntry?.snapshot || backupEntry?.data || null;
}

// ─── Weekly Report ─────────────────────────────────────────────────────────────

export function generateWeeklyReport(data) {
  const { projects, staff } = data;
  const actions = getAllActionsFlat(projects || []);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const staffMap = Object.fromEntries((staff || []).map(s => [s.id, s.name]));

  const overdue = actions.filter(a => {
    if (a.progress === 2 || !a.deadline || a.aType !== "once") return false;
    return new Date(a.deadline) < now;
  });
  const dueThisWeek = actions.filter(a => {
    if (a.progress === 2 || !a.deadline || a.aType !== "once") return false;
    const d = new Date(a.deadline);
    return d >= now && d <= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  });
  const completed = actions.filter(a => a.progress === 2);

  const lines = [
    `# 周报 ${now.toISOString().slice(0, 10)}`,
    ``,
    `## 概览`,
    `- 项目总数：${projects.length}`,
    `- 任务总数：${actions.length}`,
    `- 已完成：${completed.length}（${actions.length ? Math.round(completed.length / actions.length * 100) : 0}%）`,
    `- 逾期任务：${overdue.length}`,
    `- 本周到期：${dueThisWeek.length}`,
    ``,
    `## 逾期任务（${overdue.length}）`,
    ...overdue.slice(0, 10).map(a => `- [${a.projectName}] ${a.name}（负责人：${staffMap[a.staffId] || "未分配"}，截止：${a.deadline}）`),
    overdue.length > 10 ? `  ...及其他 ${overdue.length - 10} 条` : "",
    ``,
    `## 本周到期（${dueThisWeek.length}）`,
    ...dueThisWeek.slice(0, 10).map(a => `- [${a.projectName}] ${a.name}（负责人：${staffMap[a.staffId] || "未分配"}，截止：${a.deadline}）`),
    dueThisWeek.length > 10 ? `  ...及其他 ${dueThisWeek.length - 10} 条` : "",
  ].filter(l => l !== undefined);

  const date = now.toISOString().slice(0, 10);
  triggerDownload(lines.join("\n"), `周报_${date}.md`, "text/markdown;charset=utf-8");
}
