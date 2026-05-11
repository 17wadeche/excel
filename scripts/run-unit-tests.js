const assert = require("assert/strict");
const path = require("path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
  module._compile(output, filename);
};
const { analyzeExcelRange, buildChartDataFromRange } = require(path.resolve("src/taskpane/utils/dataImport.ts"));
const { createBackupFileName, validateDashboardPayload } = require(path.resolve("src/taskpane/utils/dashboardValidation.ts"));
const analysis = analyzeExcelRange([
  ["Month", "Revenue", "Cost"],
  ["Jan", 10, 4],
  ["Feb", 15, 5],
]);
assert.equal(analysis.hasHeaderRow, true);
assert.deepEqual(analysis.labels, ["Jan", "Feb"]);
assert.equal(analysis.datasets.length, 2);
assert.equal(analysis.datasets[0].label, "Revenue");
assert.equal(analysis.recommendedType, "line");
assert.match(analyzeExcelRange([]).warnings[0], /empty/i);
assert.match(analyzeExcelRange([["Name"], ["A"]]).warnings[0], /two columns/i);
assert.match(analyzeExcelRange([["Name", "Value"], ["A", "N\/A"]]).warnings[0], /No numeric/i);
const chartData = buildChartDataFromRange(
  [["Category", "Value"], ["A", 1], ["B", 2]],
  "Sheet1!A1:B3",
  "Sheet1"
);
assert.equal(chartData.associatedRange, "sheet1!a1:b3");
assert.equal(chartData.worksheetName, "Sheet1");
assert.deepEqual(chartData.datasets[0].data, [1, 2]);
const dashboard = {
  id: "dashboard-1",
  title: "Executive Dashboard",
  components: [
    {
      id: "dashboard-title",
      type: "title",
      data: {
        content: "Executive Dashboard",
        fontSize: 24,
        textColor: "#000",
        backgroundColor: "#fff",
        titleAlignment: "center",
      },
    },
  ],
  layouts: { lg: [] },
  workbookId: "workbook-1",
  userEmail: "user@example.com",
};
assert.equal(validateDashboardPayload(dashboard).valid, true);
const invalid = validateDashboardPayload({ ...dashboard, id: "", workbookId: "" });
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.includes("Dashboard is missing an id."));
assert.ok(invalid.errors.includes("Dashboard is missing a workbookId."));
assert.equal(
  createBackupFileName("My Q4 Dashboard!", new Date("2026-05-11T00:00:00.000Z")),
  "my-q4-dashboard-backup-2026-05-11T00-00-00-000Z.json"
);
console.log("Unit tests passed.");