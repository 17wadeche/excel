/* global Excel */
import { logger } from "./utils/logger";
export async function insertText(text: string) {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getRange("A1");
      range.values = [[text]];
      range.format.autofitColumns();
      await context.sync();
    });
  } catch (error) {
    logger.debug("Error: " + error);
  }
}
