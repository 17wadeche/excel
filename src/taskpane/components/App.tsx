import * as React from "react";
import { readWorkbookData } from "../services/excelReader";
import { buildDashboardModel } from "../services/aggregations";
import {
  AggregationType,
  DashboardConfig,
  SourceMode,
  WorkbookDataset,
} from "../types/dashboard";
import { Dashboard } from "./Dashboard";
import { FieldSelector } from "./FieldSelector";

interface AppProps {
  title?: string;
}

export default function App({ title = "Workbook Dashboard" }: AppProps) {
  const [dataset, setDataset] = React.useState<WorkbookDataset | null>(null);
  const [config, setConfig] = React.useState<DashboardConfig>({
    aggregation: "sum",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSourceMode, setLastSourceMode] = React.useState<SourceMode>("worksheet");

  const dashboardModel = React.useMemo(() => {
    if (!dataset) {
      return null;
    }

    return buildDashboardModel(dataset, config);
  }, [dataset, config]);

  const numericColumns = dataset?.columns.filter((column) => column.type === "number") ?? [];
  const dateColumns = dataset?.columns.filter((column) => column.type === "date") ?? [];
  const categoryColumns = dataset?.columns.filter((column) => column.type === "category") ?? [];

  async function analyze(sourceMode: SourceMode) {
    setLoading(true);
    setError(null);
    setLastSourceMode(sourceMode);

    try {
      const nextDataset = await readWorkbookData(sourceMode);
      setDataset(nextDataset);
      setConfig(createDefaultConfig(nextDataset));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze workbook data.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    await analyze(lastSourceMode);
  }

  function updateConfig(nextConfig: Partial<DashboardConfig>) {
    setConfig((current) => ({
      ...current,
      ...nextConfig,
    }));
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Excel Intelligence Studio</p>
          <h1>{title}</h1>
          <p>
            Transform any worksheet into an executive-grade command center with schema inference,
            quality scoring, trend velocity, category mix, and decision-ready insights.
          </p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <section className="toolbar" aria-label="Workbook analysis actions">
        <button
          className="primary-button"
          onClick={() => analyze("worksheet")}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze Worksheet"}
        </button>

        <button
          className="secondary-button"
          onClick={() => analyze("selection")}
          disabled={loading}
        >
          Analyze Selection
        </button>

        <button
          className="secondary-button"
          onClick={refresh}
          disabled={loading || !dataset}
        >
          Refresh
        </button>
      </section>

      {error && <div className="error-box">{error}</div>}

      {!dataset && !error && (
        <section className="empty-state">
          <h2>Start with your Excel data</h2>
          <p>
            Put headers in the first row, then click <strong>Analyze Worksheet</strong>. For a
            smaller dashboard, select a table-like range first and click{" "}
            <strong>Analyze Selection</strong>.
          </p>
        </section>
      )}

      {dataset && (
        <>
          <section className="source-card">
            <div>
              <span className="source-label">Source</span>
              <strong>{dataset.sourceAddress}</strong>
            </div>

            <div>
              <span className="source-label">Scope</span>
              <strong>{dataset.sourceMode === "worksheet" ? "Worksheet" : "Selection"}</strong>
            </div>

            <div>
              <span className="source-label">Rows</span>
              <strong>{dataset.rows.length}</strong>
            </div>

            <div>
              <span className="source-label">Columns</span>
              <strong>{dataset.headers.length}</strong>
            </div>
          </section>

          <section className="controls-panel">
            <div className="controls-intro">
              <p className="eyebrow">Model controls</p>
              <h2>Tune the analytical lens</h2>
            </div>
            <FieldSelector
              label="Measure"
              value={config.measureIndex}
              columns={numericColumns}
              placeholder="No numeric measure"
              onChange={(value) => updateConfig({ measureIndex: value })}
            />

            <FieldSelector
              label="Date"
              value={config.dateIndex}
              columns={dateColumns}
              placeholder="No date field"
              onChange={(value) => updateConfig({ dateIndex: value })}
            />

            <FieldSelector
              label="Category"
              value={config.categoryIndex}
              columns={categoryColumns}
              placeholder="No category field"
              onChange={(value) => updateConfig({ categoryIndex: value })}
            />

            <label className="field-selector">
              <span>Aggregation</span>
              <select
                value={config.aggregation}
                onChange={(event) =>
                  updateConfig({
                    aggregation: event.target.value as AggregationType,
                  })
                }
              >
                <option value="sum">Sum</option>
                <option value="average">Average</option>
                <option value="count">Count</option>
              </select>
            </label>
          </section>

          {dashboardModel && <Dashboard dataset={dataset} model={dashboardModel} />}
        </>
      )}
    </main>
  );
}

function createDefaultConfig(dataset: WorkbookDataset): DashboardConfig {
  const firstMeasure = dataset.columns.find((column) => column.type === "number");
  const firstDate = dataset.columns.find((column) => column.type === "date");
  const firstCategory = dataset.columns.find((column) => column.type === "category");

  return {
    measureIndex: firstMeasure?.index,
    dateIndex: firstDate?.index,
    categoryIndex: firstCategory?.index,
    aggregation: firstMeasure ? "sum" : "count",
  };
}