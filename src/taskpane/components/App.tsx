import * as React from "react";
import { readWorkbookData } from "../services/excelReader";
import { buildDashboardModel } from "../services/aggregations";
import {
  AggregationType,
  CategorySortMode,
  ChartVisualType,
  DashboardConfig,
  DashboardLayout,
  DashboardViewId,
  SourceMode,
  TextAlignment,
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
    dashboardTitle: title,
    dashboardSubtitle: "A customizable workbook intelligence board built from the active Excel data.",
    theme: DEFAULT_THEME,
    viewSettings: DEFAULT_VIEW_SETTINGS,
    visibleViews: [],
    layout: "executive",
    categorySort: "valueDesc",
    categoryLimit: 10,
    previewRowCount: 8,
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
  const visibleViewSet = new Set(config.visibleViews);

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

  function toggleView(viewId: DashboardViewId) {
    setConfig((current) => ({
      ...current,
      visibleViews: current.visibleViews.includes(viewId)
        ? current.visibleViews.filter((item) => item !== viewId)
        : [...current.visibleViews, viewId],
    }));
  }

  function reorderViews(draggedViewId: DashboardViewId, targetViewId: DashboardViewId) {
    setConfig((current) => {
      const draggedIndex = current.visibleViews.indexOf(draggedViewId);
      const targetIndex = current.visibleViews.indexOf(targetViewId);

      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
        return current;
      }

      const visibleViews = [...current.visibleViews];
      const [draggedView] = visibleViews.splice(draggedIndex, 1);
      visibleViews.splice(targetIndex, 0, draggedView);

      return {
        ...current,
        visibleViews,
      };
    });
  }

  function clearCanvas() {
    setConfig((current) => ({
      ...current,
      visibleViews: [],
    }));
  }

  function addStarterCanvas() {
    setConfig((current) => ({
      ...current,
      visibleViews: DEFAULT_VISIBLE_VIEWS,
    }));
  }

  function moveView(viewId: DashboardViewId, direction: -1 | 1) {
    setConfig((current) => {
      const currentIndex = current.visibleViews.indexOf(viewId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.visibleViews.length) {
        return current;
      }

      const visibleViews = [...current.visibleViews];
      const [view] = visibleViews.splice(currentIndex, 1);
      visibleViews.splice(nextIndex, 0, view);

      return {
        ...current,
        visibleViews,
      };
    });
  }

  function updateViewSetting(
    viewId: DashboardViewId,
    setting: Partial<DashboardConfig["viewSettings"][DashboardViewId]>
  ) {
    setConfig((current) => ({
      ...current,
      viewSettings: {
        ...current.viewSettings,
        [viewId]: {
          ...current.viewSettings[viewId],
          ...setting,
        },
      },
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

          <section className="designer-panel">
            <div className="builder-copy">
              <p className="eyebrow">Brand studio</p>
              <h2>Name it, color it, make it yours</h2>
              <p>Customize the dashboard title, subtitle, accent colors, comparison line, and panel surface.</p>
            </div>

            <div className="designer-controls">
              <label className="field-selector text-field">
                <span>Dashboard title</span>
                <input
                  value={config.dashboardTitle}
                  onChange={(event) => updateConfig({ dashboardTitle: event.target.value })}
                />
              </label>

              <label className="field-selector text-field text-field-wide">
                <span>Subtitle</span>
                <input
                  value={config.dashboardSubtitle}
                  onChange={(event) => updateConfig({ dashboardSubtitle: event.target.value })}
                />
              </label>

              <ColorField
                label="Accent"
                value={config.theme.accentColor}
                onChange={(accentColor) =>
                  updateConfig({
                    theme: {
                      ...config.theme,
                      accentColor,
                    },
                  })
                }
              />

              <ColorField
                label="Comparison"
                value={config.theme.comparisonColor}
                onChange={(comparisonColor) =>
                  updateConfig({
                    theme: {
                      ...config.theme,
                      comparisonColor,
                    },
                  })
                }
              />

              <ColorField
                label="Panel"
                value={config.theme.panelColor}
                onChange={(panelColor) =>
                  updateConfig({
                    theme: {
                      ...config.theme,
                      panelColor,
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="builder-panel">
            <div className="builder-copy">
              <p className="eyebrow">Dashboard builder</p>
              <h2>Choose the story and layout</h2>
              <p>
                Start with a blank canvas, add only the widgets you want, then drag cards on the
                report canvas to place them exactly where you want.
              </p>
              <div className="canvas-action-row">
                <button className="secondary-button canvas-clear-button" type="button" onClick={addStarterCanvas}>
                  Add starter dashboard
                </button>
                <button className="secondary-button canvas-clear-button" type="button" onClick={clearCanvas}>
                  Clear canvas
                </button>
              </div>
            </div>

            <div className="view-picker view-builder-list" aria-label="Widget library">
              {DASHBOARD_VIEW_OPTIONS.map((option) => {
                const viewIndex = config.visibleViews.indexOf(option.id);
                const isVisible = visibleViewSet.has(option.id);
                const viewSetting = config.viewSettings[option.id];

                return (
                  <article className={`view-chip view-builder-card ${isVisible ? "view-chip-active" : ""}`} key={option.id}>
                    <div className="view-card-topline">
                      <button
                        type="button"
                        onClick={() => toggleView(option.id)}
                        aria-pressed={isVisible}
                      >
                        {isVisible ? "Remove" : "Add widget"}
                      </button>
                      <div className="move-buttons" aria-label={`Move ${option.label}`}>
                        <button type="button" onClick={() => moveView(option.id, -1)} disabled={!isVisible || viewIndex <= 0}>
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveView(option.id, 1)}
                          disabled={!isVisible || viewIndex === config.visibleViews.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                    </div>

                    <label className="mini-field">
                      <span>{option.label} title</span>
                      <input
                        value={viewSetting.title}
                        onChange={(event) => updateViewSetting(option.id, { title: event.target.value })}
                      />
                    </label>

                    <div className="view-card-controls">
                      <label className="mini-field">
                        <span>Chart</span>
                        <select
                          value={viewSetting.chartType}
                          onChange={(event) =>
                            updateViewSetting(option.id, {
                              chartType: event.target.value as ChartVisualType,
                            })
                          }
                        >
                          <option value="area">Area</option>
                          <option value="line">Line</option>
                          <option value="bar">Bar</option>
                          <option value="pie">Pie</option>
                          <option value="donut">Donut</option>
                        </select>
                      </label>

                      <label className="mini-field">
                        <span>Align</span>
                        <select
                          value={viewSetting.textAlign}
                          onChange={(event) =>
                            updateViewSetting(option.id, {
                              textAlign: event.target.value as TextAlignment,
                            })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>

                      <ColorField
                        compact
                        label="Color"
                        value={viewSetting.accentColor}
                        onChange={(accentColor) => updateViewSetting(option.id, { accentColor })}
                      />
                    </div>

                    <small>{option.description}</small>
                  </article>
                );
              })}
            </div>

            <div className="builder-controls">
              <label className="field-selector">
                <span>Layout</span>
                <select
                  value={config.layout}
                  onChange={(event) =>
                    updateConfig({
                      layout: event.target.value as DashboardLayout,
                    })
                  }
                >
                  <option value="executive">Executive story</option>
                  <option value="analyst">Analyst deep dive</option>
                  <option value="compact">Compact board</option>
                </select>
              </label>

              <label className="field-selector">
                <span>Category sort</span>
                <select
                  value={config.categorySort}
                  onChange={(event) =>
                    updateConfig({
                      categorySort: event.target.value as CategorySortMode,
                    })
                  }
                >
                  <option value="valueDesc">Highest value</option>
                  <option value="valueAsc">Lowest value</option>
                  <option value="nameAsc">A to Z</option>
                  <option value="shareDesc">Largest share</option>
                </select>
              </label>

              <label className="field-selector">
                <span>Category limit</span>
                <select
                  value={config.categoryLimit}
                  onChange={(event) =>
                    updateConfig({
                      categoryLimit: Number(event.target.value),
                    })
                  }
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={25}>Top 25</option>
                </select>
              </label>

              <label className="field-selector">
                <span>Preview rows</span>
                <select
                  value={config.previewRowCount}
                  onChange={(event) =>
                    updateConfig({
                      previewRowCount: Number(event.target.value),
                    })
                  }
                >
                  <option value={5}>5 rows</option>
                  <option value={8}>8 rows</option>
                  <option value={15}>15 rows</option>
                  <option value={25}>25 rows</option>
                </select>
              </label>
            </div>
          </section>

          {dashboardModel && (
            <Dashboard
              config={config}
              dataset={dataset}
              model={dashboardModel}
              onReorderViews={reorderViews}
            />
          )}
        </>
      )}
    </main>
  );
}

function ColorField({
  compact = false,
  label,
  value,
  onChange,
}: {
  compact?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={compact ? "mini-field color-field" : "field-selector color-field"}>
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

const DEFAULT_VISIBLE_VIEWS: DashboardViewId[] = [
  "health",
  "trend",
  "categoryBar",
  "categoryPie",
  "measure",
  "columns",
  "quality",
  "preview",
];

const DASHBOARD_VIEW_OPTIONS: Array<{
  id: DashboardViewId;
  label: string;
  description: string;
}> = [
  { id: "health", label: "Health + Insights", description: "KPIs, score, and narrative" },
  { id: "trend", label: "Trend", description: "Time velocity and rolling average" },
  { id: "categoryBar", label: "Category bars", description: "Ranked grouped values" },
  { id: "categoryPie", label: "Category share", description: "Portfolio mix view" },
  { id: "measure", label: "Measure profile", description: "Distribution stats" },
  { id: "columns", label: "Column map", description: "Schema and completeness" },
  { id: "quality", label: "Trust checks", description: "Data cleanup guidance" },
  { id: "preview", label: "Preview", description: "Raw rows for validation" },
];

const DEFAULT_THEME = {
  accentColor: "#4f46e5",
  comparisonColor: "#06b6d4",
  panelColor: "#ffffff",
};

const DEFAULT_VIEW_SETTINGS = {
  health: { title: "Health + Insights", accentColor: "#4f46e5", chartType: "donut" as ChartVisualType, textAlign: "left" as TextAlignment },
  trend: { title: "Trend Velocity", accentColor: "#4f46e5", chartType: "area" as ChartVisualType, textAlign: "left" as TextAlignment },
  categoryBar: { title: "Top Categories", accentColor: "#6366f1", chartType: "bar" as ChartVisualType, textAlign: "left" as TextAlignment },
  categoryPie: { title: "Category Share", accentColor: "#06b6d4", chartType: "donut" as ChartVisualType, textAlign: "left" as TextAlignment },
  measure: { title: "Measure Profile", accentColor: "#a855f7", chartType: "bar" as ChartVisualType, textAlign: "left" as TextAlignment },
  columns: { title: "Column Intelligence", accentColor: "#10b981", chartType: "bar" as ChartVisualType, textAlign: "left" as TextAlignment },
  quality: { title: "Data Quality", accentColor: "#f59e0b", chartType: "bar" as ChartVisualType, textAlign: "left" as TextAlignment },
  preview: { title: "Data Preview", accentColor: "#64748b", chartType: "bar" as ChartVisualType, textAlign: "left" as TextAlignment },
};


function createDefaultConfig(dataset: WorkbookDataset): DashboardConfig {
  const firstMeasure = dataset.columns.find((column) => column.type === "number");
  const firstDate = dataset.columns.find((column) => column.type === "date");
  const firstCategory = dataset.columns.find((column) => column.type === "category");

  return {
    measureIndex: firstMeasure?.index,
    dateIndex: firstDate?.index,
    categoryIndex: firstCategory?.index,
    aggregation: firstMeasure ? "sum" : "count",
    dashboardTitle: "Workbook Command Center",
    dashboardSubtitle: `${dataset.rows.length} rows from ${dataset.sourceAddress}`,
    theme: DEFAULT_THEME,
    viewSettings: DEFAULT_VIEW_SETTINGS,
    visibleViews: [],
    layout: "executive",
    categorySort: "valueDesc",
    categoryLimit: 10,
    previewRowCount: 8,
  };
}