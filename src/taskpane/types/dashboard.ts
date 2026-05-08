export type ColumnType = "date" | "number" | "category" | "text";

export type SourceMode = "worksheet" | "selection";

export type AggregationType = "sum" | "average" | "count";

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
}

export interface Kpi {
  label: string;
  value: number | string;
  helper?: string;
}

export interface ChartPoint {
  name?: string;
  date?: string;
  value: number;
}

export interface DashboardModel {
  kpis: Kpi[];
  trendData: ChartPoint[];
  categoryData: ChartPoint[];
  dataQualityMessages: string[];
  previewRows: unknown[][];
}