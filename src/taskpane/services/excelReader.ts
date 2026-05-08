import { WorkbookDataset, SourceMode } from "../types/dashboard";
import { inferSchema } from "./schemaInference";

/* global Excel */

export async function readWorkbookData(sourceMode: SourceMode): Promise<WorkbookDataset> {
  return Excel.run(async (context) => {
    const range =
      sourceMode === "selection"
        ? context.workbook.getSelectedRange()
        : context.workbook.worksheets.getActiveWorksheet().getUsedRange();

    range.load(["values", "numberFormat", "address", "rowCount", "columnCount"]);

    await context.sync();

    const values = range.values as unknown[][];
    const numberFormats = range.numberFormat as string[][];

    if (!values || values.length < 2) {
      throw new Error("The selected data needs at least one header row and one data row.");
    }

    const headers = values[0].map((value, index) => {
      const header = String(value ?? "").trim();
      return header || `Column ${index + 1}`;
    });

    const rows = values.slice(1);
    const columns = inferSchema(headers, rows, numberFormats);

    return {
      headers,
      rows,
      numberFormats,
      columns,
      sourceAddress: range.address,
      sourceMode,
    };
  });
}
