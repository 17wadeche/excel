import {
  AggregationType,
  ChartPoint,
  DashboardConfig,
  DashboardModel,
  WorkbookDataset,
} from "../types/dashboard";
import { toDateKey, toNumber } from "./schemaInference";

export function buildDashboardModel(
  dataset: WorkbookDataset,
  config: DashboardConfig
): DashboardModel {
  const measureColumn = getColumn(dataset, config.measureIndex);
  const categoryColumn = getColumn(dataset, config.categoryIndex);
  const dateColumn = getColumn(dataset, config.dateIndex);

  const missingCellCount = countMissingCells(dataset);
  const duplicateHeaderCount = countDuplicateHeaders(dataset.headers);

  const kpis = [
    {
      label: "Rows",
      value: dataset.rows.length,
      helper: "Data rows found",
    },
    {
      label: "Columns",
      value: dataset.headers.length,
      helper: "Fields detected",
    },
    {
      label: "Missing Cells",
      value: missingCellCount,
      helper: "Blank values in the dataset",
    },
  ];

  if (measureColumn && config.aggregation !== "count") {
    const values = dataset.rows
      .map((row) => toNumber(row[measureColumn.index]))
      .filter((value): value is number => value !== null);

    const total = values.reduce((sum, value) => sum + value, 0);
    const average = values.length > 0 ? total / values.length : 0;

    kpis.push({
      label: `Total ${measureColumn.name}`,
      value: roundNumber(total),
      helper: "Sum of selected measure",
    });

    kpis.push({
      label: `Avg ${measureColumn.name}`,
      value: roundNumber(average),
      helper: "Average of selected measure",
    });
  }

  const trendData =
    dateColumn && (measureColumn || config.aggregation === "count")
      ? aggregateByDate(dataset, dateColumn.index, measureColumn?.index, config.aggregation)
      : [];

  const categoryData =
    categoryColumn && (measureColumn || config.aggregation === "count")
      ? aggregateByCategory(dataset, categoryColumn.index, measureColumn?.index, config.aggregation)
      : [];

  const dataQualityMessages = buildDataQualityMessages(dataset, missingCellCount, duplicateHeaderCount);

  return {
    kpis,
    trendData,
    categoryData,
    dataQualityMessages,
    previewRows: dataset.rows.slice(0, 8),
  };
}

function aggregateByCategory(
  dataset: WorkbookDataset,
  categoryIndex: number,
  measureIndex: number | undefined,
  aggregation: AggregationType
): ChartPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const row of dataset.rows) {
    const key = String(row[categoryIndex] ?? "Unknown").trim() || "Unknown";
    const value = getAggregationValue(row, measureIndex, aggregation);

    if (value === null) continue;

    const bucket = buckets.get(key) ?? { sum: 0, count: 0 };

    bucket.sum += value;
    bucket.count += 1;

    buckets.set(key, bucket);
  }

  const points: ChartPoint[] = [];

  buckets.forEach((bucket, name) => {
    points.push({
      name,
      value: finalizeAggregation(bucket, aggregation),
    });
  });

return points.sort((a, b) => b.value - a.value).slice(0, 10);
}

function aggregateByDate(
  dataset: WorkbookDataset,
  dateIndex: number,
  measureIndex: number | undefined,
  aggregation: AggregationType
): ChartPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (let rowIndex = 0; rowIndex < dataset.rows.length; rowIndex++) {
    const row = dataset.rows[rowIndex];
    const numberFormat = dataset.numberFormats[rowIndex + 1]?.[dateIndex] ?? "";
    const dateKey = toDateKey(row[dateIndex], numberFormat);

    if (!dateKey) continue;

    const value = getAggregationValue(row, measureIndex, aggregation);

    if (value === null) continue;

    const bucket = buckets.get(dateKey) ?? { sum: 0, count: 0 };

    bucket.sum += value;
    bucket.count += 1;

    buckets.set(dateKey, bucket);
  }

  const points: ChartPoint[] = [];

  buckets.forEach((bucket, date) => {
    points.push({
      date,
      value: finalizeAggregation(bucket, aggregation),
    });
  });

return points.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getAggregationValue(
  row: unknown[],
  measureIndex: number | undefined,
  aggregation: AggregationType
): number | null {
  if (aggregation === "count") {
    return 1;
  }

  if (measureIndex === undefined) {
    return null;
  }

  return toNumber(row[measureIndex]);
}

function finalizeAggregation(
  bucket: { sum: number; count: number },
  aggregation: AggregationType
): number {
  if (aggregation === "average") {
    return roundNumber(bucket.count > 0 ? bucket.sum / bucket.count : 0);
  }

  if (aggregation === "count") {
    return bucket.count;
  }

  return roundNumber(bucket.sum);
}

function getColumn(dataset: WorkbookDataset, index: number | undefined) {
  if (index === undefined) {
    return undefined;
  }

  return dataset.columns.find((column) => column.index === index);
}

function countMissingCells(dataset: WorkbookDataset): number {
  return dataset.rows.reduce((total, row) => {
    return (
      total +
      row.filter((cell) => cell === null || cell === undefined || String(cell).trim() === "").length
    );
  }, 0);
}

function countDuplicateHeaders(headers: string[]): number {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  return normalized.length - new Set(normalized).size;
}

function buildDataQualityMessages(
  dataset: WorkbookDataset,
  missingCellCount: number,
  duplicateHeaderCount: number
): string[] {
  const messages: string[] = [];

  const numberCount = dataset.columns.filter((column) => column.type === "number").length;
  const dateCount = dataset.columns.filter((column) => column.type === "date").length;
  const categoryCount = dataset.columns.filter((column) => column.type === "category").length;

  messages.push(`Detected ${numberCount} numeric field(s), ${dateCount} date field(s), and ${categoryCount} category field(s).`);

  if (missingCellCount > 0) {
    messages.push(`${missingCellCount} blank cell(s) found.`);
  }

  if (duplicateHeaderCount > 0) {
    messages.push(`${duplicateHeaderCount} duplicate header(s) found. Consider renaming them.`);
  }

  if (dateCount === 0) {
    messages.push("No date field was detected, so trend charts may not appear.");
  }

  if (numberCount === 0) {
    messages.push("No numeric measure was detected. Use Count as the aggregation.");
  }

  return messages;
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}