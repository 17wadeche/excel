/* global localStorage URL document Blob */
import type { DashboardItem } from "../components/types";
import { createBackupFileName } from "./dashboardValidation";
const DRAFT_PREFIX = "workbookDashboard.draft";
const draftKey = (dashboardId: string) => `${DRAFT_PREFIX}.${dashboardId}`;
export interface DashboardDraftRecord {
  dashboard: DashboardItem;
  savedAt: string;
  reason?: string;
}
export const saveDashboardDraft = (dashboard: DashboardItem, reason?: string) => {
  localStorage.setItem(
    draftKey(dashboard.id),
    JSON.stringify({ dashboard, savedAt: new Date().toISOString(), reason })
  );
};
export const getDashboardDraft = (dashboardId: string): DashboardDraftRecord | null => {
  const raw = localStorage.getItem(draftKey(dashboardId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as DashboardDraftRecord;
  } catch {
    localStorage.removeItem(draftKey(dashboardId));
    return null;
  }
};
export const clearDashboardDraft = (dashboardId: string) => {
  localStorage.removeItem(draftKey(dashboardId));
};
export const createDashboardDraftDownload = (draft: DashboardDraftRecord) => {
  const blob = new Blob([JSON.stringify(draft.dashboard, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = createBackupFileName(draft.dashboard.title || "dashboard-draft");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};