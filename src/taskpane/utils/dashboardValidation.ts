import type { DashboardItem, Widget } from "../components/types";
export interface DashboardValidationResult {
  valid: boolean;
  errors: string[];
}
const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const widgetTypes = new Set([
  "title",
  "text",
  "chart",
  "gantt",
  "image",
  "metric",
  "table",
  "line",
]);
export const validateWidget = (widget: Widget): string[] => {
  const errors: string[] = [];
  if (!widget.id) errors.push("Widget is missing an id.");
  if (!widgetTypes.has(widget.type)) errors.push(`Unsupported widget type: ${widget.type}.`);
  if (!isObject(widget.data)) errors.push(`Widget ${widget.id || "unknown"} is missing data.`);
  return errors;
};
export const validateDashboardPayload = (dashboard: DashboardItem): DashboardValidationResult => {
  const errors: string[] = [];
  if (!dashboard.id) errors.push("Dashboard is missing an id.");
  if (!dashboard.title) errors.push("Dashboard is missing a title.");
  if (!dashboard.workbookId) errors.push("Dashboard is missing a workbookId.");
  if (!Array.isArray(dashboard.components)) errors.push("Dashboard components must be an array.");
  if (!isObject(dashboard.layouts)) errors.push("Dashboard layouts must be an object.");
  dashboard.components?.forEach((widget) => errors.push(...validateWidget(widget)));
  return { valid: errors.length === 0, errors };
};
export const createBackupFileName = (title: string, date = new Date()) => {
  const safeTitle = title
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${safeTitle || "dashboard"}-backup-${date.toISOString().replace(/[:.]/g, "-")}.json`;
};