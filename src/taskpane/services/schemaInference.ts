import { DataColumn } from "../types/dashboard";

export function inferSchema(
  headers: string[],
  rows: unknown[][],
  numberFormats: string[][]
): DataColumn[] {
  return headers.map((name, index) => {
    const entries = rows
      .map((row, rowIndex) => ({
        value: row[index],
        numberFormat: String(numberFormats[rowIndex + 1]?.[index] ?? ""),
      }))
      .filter(({ value }) => value !== null && value !== undefined && value !== "");

    const sampleCount = entries.length || 1;
    const uniqueCount = new Set(entries.map(({ value }) => String(value).trim())).size;

    const dateCount = entries.filter(({ value, numberFormat }) =>
      isLikelyDate(value, numberFormat)
    ).length;

    const numberCount = entries.filter(({ value, numberFormat }) => {
      if (isLikelyDate(value, numberFormat)) return false;
      return toNumber(value) !== null;
    }).length;

    let type: DataColumn["type"] = "text";

    if (dateCount / sampleCount >= 0.7) {
      type = "date";
    } else if (numberCount / sampleCount >= 0.8) {
      type = "number";
    } else if (sampleCount >= 2 && uniqueCount <= Math.max(5, sampleCount * 0.5)) {
      type = "category";
    }

    return {
      name,
      index,
      type,
      sampleCount: entries.length,
      uniqueCount,
    };
  });
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const negativeParentheses = trimmed.match(/^\((.*)\)$/);
  const normalized = negativeParentheses ? `-${negativeParentheses[1]}` : trimmed;

  const cleaned = normalized.replace(/[$£€,\s]/g, "").replace(/%$/, "");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

export function toDateKey(value: unknown, numberFormat?: string): string | null {
  let date: Date | null = null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    date = value;
  } else if (typeof value === "number" && isLikelyDate(value, numberFormat)) {
    date = excelSerialDateToDate(value);
  } else if (typeof value === "string" && isLikelyDate(value, numberFormat)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function isLikelyDate(value: unknown, numberFormat = ""): boolean {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return true;
  }

  if (typeof value === "number") {
    return isDateNumberFormat(numberFormat) && value > 20000 && value < 80000;
  }

  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return false;
  }

  const hasDateLikeText =
    /[-/]/.test(trimmed) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(trimmed);

  if (!hasDateLikeText) {
    return false;
  }

  const parsed = Date.parse(trimmed);

  return !Number.isNaN(parsed);
}

function isDateNumberFormat(numberFormat: string): boolean {
  const cleaned = numberFormat.toLowerCase().replace(/\[[^\]]+\]/g, "");

  if (!cleaned) {
    return false;
  }

  const hasYear = cleaned.includes("yy");
  const hasMonthName = cleaned.includes("mmm");
  const hasDateSeparators = /[dmy][-/ ][dmy]/i.test(cleaned);

  return hasYear || hasMonthName || hasDateSeparators;
}

function excelSerialDateToDate(serial: number): Date {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return new Date(excelEpoch + serial * millisecondsPerDay);
}
