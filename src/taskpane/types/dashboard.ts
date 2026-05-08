export type ColumnType = "date" | "number" | "category" | "text";

export type SourceMode = "worksheet" | "selection";

export type AggregationType = "sum" | "average" | "count";

export type DashboardViewId =
  | "health"
  | "trend"
  | "categoryBar"
  | "categoryPie"
  | "measure"
  | "columns"
  | "quality"
  | "preview";

export type DashboardLayout = "executive" | "analyst" | "compact";

export type CategorySortMode = "valueDesc" | "valueAsc" | "nameAsc" | "shareDesc";

export interface DataColumn {
  name: string;
  index: number;
  type: ColumnType;
  sampleCount: number;
  uniqueCount: number;
}

export interface WorkbookDataset {
  headers: string[];
  rows: unknown[][];
  numberFormats: string[][];
  columns: DataColumn[];
  sourceAddress: string;
  sourceMode: SourceMode;
}

export interface DashboardConfig {
  measureIndex?: number;
  categoryIndex?: number;
  dateIndex?: number;
  aggregation: AggregationType;
  visibleViews: DashboardViewId[];
  layout: DashboardLayout;
  categorySort: CategorySortMode;
  categoryLimit: number;
  previewRowCount: number;
}

export interface Kpi {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "blue" | "purple" | "emerald" | "amber" | "rose";
}

export interface ChartPoint {
  name?: string;
  date?: string;
  value: number;
  comparison?: number;
  share?: number;
}

export interface DashboardInsight {
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  filledCount: number;
  missingCount: number;
  uniqueCount: number;
  completeness: number;
}

export interface DashboardModel {
  kpis: Kpi[];
  trendData: ChartPoint[];
  categoryData: ChartPoint[];
  dataQualityMessages: string[];
  previewRows: unknown[][];
  insights: DashboardInsight[];
  columnProfiles: ColumnProfile[];
  qualityScore: number;
  measureSummary?: {
    name: string;
    min: number;
    max: number;
    average: number;
    median: number;
    standardDeviation: number;
  };
}
