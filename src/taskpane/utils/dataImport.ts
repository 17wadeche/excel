import type { ChartData, DashboardChartType } from "../components/types";
export interface ExcelRangeAnalysis {
  labels: string[];
  datasets: ChartData["datasets"];
  hasHeaderRow: boolean;
  recommendedType: DashboardChartType;
  warnings: string[];
}
const isNumeric = (value: unknown): boolean =>
  value !== null && value !== "" && !Number.isNaN(Number(value));
const asLabel = (value: unknown, fallback: string) =>
  value === null || value === undefined || value === "" ? fallback : String(value);
export const analyzeExcelRange = (values: unknown[][]): ExcelRangeAnalysis => {
  const warnings: string[] = [];
  if (!values.length || !values[0]?.length) {
    return {
      labels: [],
      datasets: [],
      hasHeaderRow: false,
      recommendedType: "bar",
      warnings: ["The selected range is empty."],
    };
  }
  const maxColumns = Math.max(...values.map((row) => row.length));
  if (maxColumns < 2) {
    return {
      labels: [],
      datasets: [],
      hasHeaderRow: false,
      recommendedType: "bar",
      warnings: ["Select at least two columns: labels and one numeric value column."],
    };
  }
  const firstRow = values[0] ?? [];
  const dataRows = values.slice(1);
  const hasHeaderRow =
    firstRow.slice(1).some((cell) => !isNumeric(cell)) &&
    dataRows.some((row) => row.slice(1).some(isNumeric));
  const rows = hasHeaderRow ? dataRows : values;
  const labels = rows.map((row, index) => asLabel(row[0], `Row ${index + 1}`));
  const numericColumnIndexes: number[] = [];
  for (let columnIndex = 1; columnIndex < maxColumns; columnIndex += 1) {
    const numericValues = rows.map((row) => row[columnIndex]).filter(isNumeric);
    if (numericValues.length > 0) {
      numericColumnIndexes.push(columnIndex);
    }
  }
  if (!numericColumnIndexes.length) {
    warnings.push("No numeric value columns were found in the selected range.");
  }
  const palette = ["#4caf50", "#1890ff", "#fa8c16", "#722ed1", "#eb2f96", "#13c2c2"];
  const datasets = numericColumnIndexes.map((columnIndex, index) => ({
    label: hasHeaderRow
      ? asLabel(firstRow[columnIndex], `Series ${index + 1}`)
      : `Series ${index + 1}`,
    data: rows.map((row) => (isNumeric(row[columnIndex]) ? Number(row[columnIndex]) : 0)),
    backgroundColor: palette[index % palette.length],
  }));
  const recommendedType: DashboardChartType =
    datasets.length > 1 ? "line" : labels.length <= 6 ? "bar" : "line";
  return { labels, datasets, hasHeaderRow, recommendedType, warnings };
};
export const buildChartDataFromRange = (
  values: unknown[][],
  associatedRange: string,
  worksheetName: string,
  title = "Imported Data"
): ChartData => {
  const analysis = analyzeExcelRange(values);
  return {
    type: analysis.recommendedType,
    title,
    labels: analysis.labels,
    datasets: analysis.datasets,
    titleAlignment: "left",
    associatedRange: associatedRange.toLowerCase(),
    worksheetName,
  };
};