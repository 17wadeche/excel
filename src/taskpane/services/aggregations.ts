import {
  AggregationType,
  CategorySortMode,
  ChartPoint,
  ColumnProfile,
  DashboardConfig,
  DashboardInsight,
  DashboardModel,
  Kpi,
  WorkbookDataset,
} from "../types/dashboard";
import { toDateKey, toNumber } from "./schemaInference";

interface Bucket {
  sum: number;
  count: number;
}

interface NumericSummary {
  name: string;
  min: number;
  max: number;
  average: number;
  median: number;
  standardDeviation: number;
}

export function buildDashboardModel(
  dataset: WorkbookDataset,
  config: DashboardConfig
): DashboardModel {
  const measureColumn = getColumn(dataset, config.measureIndex);
  const categoryColumn = getColumn(dataset, config.categoryIndex);
  const dateColumn = getColumn(dataset, config.dateIndex);

  const missingCellCount = countMissingCells(dataset);
  const duplicateHeaderCount = countDuplicateHeaders(dataset.headers);
  const populatedCellCount = dataset.rows.length * dataset.headers.length - missingCellCount;
  const totalCellCount = Math.max(dataset.rows.length * dataset.headers.length, 1);
  const qualityScore = calculateQualityScore(dataset, missingCellCount, duplicateHeaderCount);
  const measureSummary = measureColumn
    ? summarizeMeasure(dataset, measureColumn.index, measureColumn.name)
    : undefined;

  const kpis: Kpi[] = [
    {
      label: "Rows",
      value: dataset.rows.length,
      helper: "Data rows found",
      tone: "blue",
    },
    {
      label: "Fields",
      value: dataset.headers.length,
      helper: "Workbook columns profiled",
      tone: "purple",
    },
    {
      label: "Completeness",
      value: `${Math.round((populatedCellCount / totalCellCount) * 100)}%`,
      helper: `${missingCellCount} blank cell(s) detected`,
      tone: missingCellCount > 0 ? "amber" : "emerald",
    },
    {
      label: "Quality Score",
      value: qualityScore,
      helper: "Schema confidence and cleanliness",
      tone: qualityScore >= 85 ? "emerald" : qualityScore >= 65 ? "amber" : "rose",
    },
  ];

  if (measureSummary && config.aggregation !== "count") {
    kpis.push({
      label: `Total ${measureSummary.name}`,
      value: roundNumber(
        measureSummary.average * getNumericValues(dataset, measureColumn?.index).length
      ),
      helper: "Sum of selected measure",
      tone: "blue",
    });

    kpis.push({
      label: `Median ${measureSummary.name}`,
      value: measureSummary.median,
      helper: `Range ${formatNumber(measureSummary.min)} – ${formatNumber(measureSummary.max)}`,
      tone: "purple",
    });
  }

  const trendData =
    dateColumn && (measureColumn || config.aggregation === "count")
      ? aggregateByDate(dataset, dateColumn.index, measureColumn?.index, config.aggregation)
      : [];

  const categoryData =
    categoryColumn && (measureColumn || config.aggregation === "count")
      ? aggregateByCategory(
          dataset,
          categoryColumn.index,
          measureColumn?.index,
          config.aggregation,
          config.categorySort,
          config.categoryLimit
        )
      : [];

  const dataQualityMessages = buildDataQualityMessages(
    dataset,
    missingCellCount,
    duplicateHeaderCount,
    qualityScore
  );

  return {
    kpis,
    trendData,
    categoryData,
    dataQualityMessages,
    previewRows: dataset.rows.slice(0, config.previewRowCount),
    insights: buildInsights(dataset, trendData, categoryData, qualityScore, measureSummary),
    columnProfiles: buildColumnProfiles(dataset),
    qualityScore,
    measureSummary,
  };
}

function aggregateByCategory(
  dataset: WorkbookDataset,
  categoryIndex: number,
  measureIndex: number | undefined,
  aggregation: AggregationType,
  sortMode: CategorySortMode,
  limit: number
): ChartPoint[] {
  const buckets = new Map<string, Bucket>();

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
  let totalValue = 0;

  buckets.forEach((bucket, name) => {
    const value = finalizeAggregation(bucket, aggregation);
    totalValue += value;
    points.push({ name, value });
  });

  return points
    .map((point) => ({
      ...point,
      share: totalValue > 0 ? roundNumber((point.value / totalValue) * 100) : 0,
    }))
    .sort((a, b) => sortCategoryPoints(a, b, sortMode))
    .slice(0, limit);
}

function sortCategoryPoints(a: ChartPoint, b: ChartPoint, sortMode: CategorySortMode): number {
  if (sortMode === "valueAsc") {
    return a.value - b.value;
  }

  if (sortMode === "nameAsc") {
    return String(a.name).localeCompare(String(b.name));
  }

  if (sortMode === "shareDesc") {
    return (b.share ?? 0) - (a.share ?? 0);
  }

  return b.value - a.value;
}

function aggregateByDate(
  dataset: WorkbookDataset,
  dateIndex: number,
  measureIndex: number | undefined,
  aggregation: AggregationType
): ChartPoint[] {
  const buckets = new Map<string, Bucket>();

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

  return points
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((point, index, sortedPoints) => ({
      ...point,
      comparison: calculateRollingAverage(sortedPoints, index),
    }));
}

function calculateRollingAverage(points: ChartPoint[], index: number): number {
  const windowStart = Math.max(0, index - 2);
  const window = points.slice(windowStart, index + 1);
  const total = window.reduce((sum, point) => sum + point.value, 0);

  return roundNumber(total / Math.max(window.length, 1));
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

function finalizeAggregation(bucket: Bucket, aggregation: AggregationType): number {
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

function calculateQualityScore(
  dataset: WorkbookDataset,
  missingCellCount: number,
  duplicateHeaderCount: number
): number {
  const totalCells = Math.max(dataset.rows.length * dataset.headers.length, 1);
  const missingPenalty = (missingCellCount / totalCells) * 45;
  const duplicatePenalty = duplicateHeaderCount * 10;
  const textOnlyPenalty = dataset.columns.every((column) => column.type === "text") ? 20 : 0;

  return Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty - textOnlyPenalty));
}

function buildDataQualityMessages(
  dataset: WorkbookDataset,
  missingCellCount: number,
  duplicateHeaderCount: number,
  qualityScore: number
): string[] {
  const messages: string[] = [];

  const numberCount = dataset.columns.filter((column) => column.type === "number").length;
  const dateCount = dataset.columns.filter((column) => column.type === "date").length;
  const categoryCount = dataset.columns.filter((column) => column.type === "category").length;

  messages.push(
    `Detected ${numberCount} numeric field(s), ${dateCount} date field(s), and ${categoryCount} category field(s).`
  );
  messages.push(
    `Overall quality score is ${qualityScore}/100 based on blanks, headers, and schema richness.`
  );

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

function buildInsights(
  dataset: WorkbookDataset,
  trendData: ChartPoint[],
  categoryData: ChartPoint[],
  qualityScore: number,
  measureSummary?: NumericSummary
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  if (trendData.length >= 2) {
    const first = trendData[0].value;
    const last = trendData[trendData.length - 1].value;
    const change = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;

    insights.push({
      title: change >= 0 ? "Momentum is up" : "Momentum is down",
      detail: `${formatNumber(Math.abs(change))}% change from the first to latest trend point.`,
      tone: change >= 0 ? "positive" : "warning",
    });
  }

  if (categoryData.length > 0) {
    const leader = categoryData[0];
    insights.push({
      title: `${leader.name} leads the mix`,
      detail: `${formatNumber(leader.share ?? 0)}% of the visible category contribution.`,
      tone: (leader.share ?? 0) > 50 ? "warning" : "neutral",
    });
  }

  if (measureSummary) {
    insights.push({
      title: "Measure volatility",
      detail: `Standard deviation is ${formatNumber(measureSummary.standardDeviation)} around a ${formatNumber(
        measureSummary.average
      )} average.`,
      tone: "neutral",
    });
  }

  insights.push({
    title: qualityScore >= 85 ? "Ready for decisions" : "Needs cleanup",
    detail:
      qualityScore >= 85
        ? `${dataset.headers.length} fields are profiled with strong data quality signals.`
        : "Fix blanks, duplicate headers, or missing typed fields to improve confidence.",
    tone: qualityScore >= 85 ? "positive" : "warning",
  });

  return insights.slice(0, 4);
}

function buildColumnProfiles(dataset: WorkbookDataset): ColumnProfile[] {
  return dataset.columns.slice(0, 8).map((column) => {
    const missingCount = dataset.rows.filter((row) => {
      const value = row[column.index];
      return value === null || value === undefined || String(value).trim() === "";
    }).length;
    const filledCount = dataset.rows.length - missingCount;
    const completeness =
      dataset.rows.length > 0 ? Math.round((filledCount / dataset.rows.length) * 100) : 0;

    return {
      name: column.name,
      type: column.type,
      filledCount,
      missingCount,
      uniqueCount: column.uniqueCount,
      completeness,
    };
  });
}

function summarizeMeasure(
  dataset: WorkbookDataset,
  measureIndex: number,
  measureName: string
): NumericSummary | undefined {
  const values = getNumericValues(dataset, measureIndex).sort((a, b) => a - b);

  if (values.length === 0) {
    return undefined;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    Math.max(values.length, 1);
  const middle = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];

  return {
    name: measureName,
    min: roundNumber(values[0]),
    max: roundNumber(values[values.length - 1]),
    average: roundNumber(average),
    median: roundNumber(median),
    standardDeviation: roundNumber(Math.sqrt(variance)),
  };
}

function getNumericValues(dataset: WorkbookDataset, measureIndex: number | undefined): number[] {
  if (measureIndex === undefined) {
    return [];
  }

  return dataset.rows
    .map((row) => toNumber(row[measureIndex]))
    .filter((value): value is number => value !== null);
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}
