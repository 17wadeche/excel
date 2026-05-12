import type { DashboardItem, DashboardVersion, Widget } from "../components/types";
export interface DashboardVersionDiff {
  addedWidgets: number;
  removedWidgets: number;
  changedWidgets: number;
  titleChanged: boolean;
  layoutChanged: boolean;
  borderChanged: boolean;
}
type ComparableDashboard = Pick<
  DashboardItem | DashboardVersion,
  "title" | "components" | "layouts" | "borderSettings"
>;
const normalize = (value: unknown) => JSON.stringify(value ?? null);
const widgetMap = (widgets: Widget[]) =>
  widgets.reduce<Map<string, Widget>>((map, widget) => map.set(widget.id, widget), new Map());
export const diffDashboardVersions = (
  current: ComparableDashboard,
  candidate: ComparableDashboard
): DashboardVersionDiff => {
  const currentWidgets = widgetMap(current.components ?? []);
  const candidateWidgets = widgetMap(candidate.components ?? []);
  let changedWidgets = 0;
  candidateWidgets.forEach((candidateWidget, id) => {
    const currentWidget = currentWidgets.get(id);
    if (currentWidget && normalize(currentWidget) !== normalize(candidateWidget)) {
      changedWidgets += 1;
    }
  });
  return {
    addedWidgets: [...candidateWidgets.keys()].filter((id) => !currentWidgets.has(id)).length,
    removedWidgets: [...currentWidgets.keys()].filter((id) => !candidateWidgets.has(id)).length,
    changedWidgets,
    titleChanged: (current.title || "") !== (candidate.title || ""),
    layoutChanged: normalize(current.layouts) !== normalize(candidate.layouts),
    borderChanged: normalize(current.borderSettings) !== normalize(candidate.borderSettings),
  };
};
export const hasDashboardVersionDiff = (diff: DashboardVersionDiff) =>
  diff.addedWidgets > 0 ||
  diff.removedWidgets > 0 ||
  diff.changedWidgets > 0 ||
  diff.titleChanged ||
  diff.layoutChanged ||
  diff.borderChanged;