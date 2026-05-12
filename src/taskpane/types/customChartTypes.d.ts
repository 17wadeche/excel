// customChartTypes.d.ts
import type { ChartTypeRegistry as BaseChartTypeRegistry } from "chart.js";
declare module "chart.js" {
  interface ChartTypeRegistry {
    barWithErrorBars: BaseChartTypeRegistry["bar"];
    lineWithErrorBars: BaseChartTypeRegistry["line"];
  }
}