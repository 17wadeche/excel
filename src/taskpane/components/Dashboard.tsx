import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartPoint,
  DashboardConfig,
  DashboardLayout,
  DashboardModel,
  DashboardViewId,
  DashboardViewSettings,
  WorkbookDataset,
} from "../types/dashboard";
import { KpiCard } from "./KpiCard";

interface DashboardProps {
  config: DashboardConfig;
  dataset: WorkbookDataset;
  model: DashboardModel;
}

const CATEGORY_COLORS = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

export function Dashboard({ config, dataset, model }: DashboardProps) {
  const dashboardStyle = {
    "--dashboard-accent": config.theme.accentColor,
    "--dashboard-comparison": config.theme.comparisonColor,
    "--dashboard-panel": config.theme.panelColor,
  } as React.CSSProperties;

  return (
    <section className={`dashboard dashboard-${config.layout}`} style={dashboardStyle}>
      <DashboardBlueprint config={config} visibleCount={config.visibleViews.length} />

      <section className="dashboard-title-card panel panel-accent">
        <p className="eyebrow">Custom report</p>
        <h1>{config.dashboardTitle}</h1>
        <p>{config.dashboardSubtitle}</p>
      </section>

      <section className="dashboard-mosaic">
        {config.visibleViews.map((viewId) => renderDashboardView(viewId, dataset, model, config))}
      </section>
    </section>
  );
}

function DashboardBlueprint({ config, visibleCount }: { config: DashboardConfig; visibleCount: number }) {
  return (
    <section className="blueprint-strip">
      <div>
        <p className="eyebrow">Live report recipe</p>
        <h2>{formatLayout(config.layout)} layout</h2>
        <p>
          {visibleCount} active view(s) · {formatCategorySort(config.categorySort)} · {config.categoryLimit} category group(s) · {config.previewRowCount} preview row(s)
        </p>
      </div>
      <div className="blueprint-pills" aria-label="Active dashboard recipe">
        {config.visibleViews.map((viewId, index) => (
          <span key={viewId}>{index + 1}. {config.viewSettings[viewId].title}</span>
        ))}
      </div>
    </section>
  );
}

function renderDashboardView(
  viewId: DashboardViewId,
  dataset: WorkbookDataset,
  model: DashboardModel,
  config: DashboardConfig
) {
  const settings = config.viewSettings[viewId];
  if (viewId === "health") {
    return <HealthView key={viewId} model={model} settings={settings} />;
  }

  if (viewId === "trend") {
    return <TrendView key={viewId} model={model} settings={settings} comparisonColor={config.theme.comparisonColor} />;
  }

  if (viewId === "categoryBar") {
    return <CategoryBarView key={viewId} model={model} settings={settings} />;
  }

  if (viewId === "categoryPie") {
    return <CategoryPieView key={viewId} model={model} settings={settings} />;
  }

  if (viewId === "measure") {
    return <MeasureView key={viewId} model={model} settings={settings} />;
  }

  if (viewId === "columns") {
    return <ColumnsView key={viewId} model={model} settings={settings} />;
  }

  if (viewId === "quality") {
    return <QualityView key={viewId} model={model} settings={settings} />;
  }

  return <PreviewView key={viewId} dataset={dataset} model={model} settings={settings} />;
}

function HealthView({ model, settings }: { model: DashboardModel; settings: DashboardViewSettings }) {
  return (
    <section className="dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
      <section className="kpi-grid">
        {model.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="insight-grid">
        <article className="quality-orb panel panel-accent">
          <div className="orb" style={{ "--score": model.qualityScore } as React.CSSProperties}>
            <span>{model.qualityScore}</span>
          </div>
          <div>
            <p className="eyebrow">Intelligence layer</p>
            <h2>{settings.title}</h2>
            <p className="muted">
              A blended signal from completeness, duplicate headers, and detected schema richness.
            </p>
          </div>
        </article>

        <article className="panel insight-panel">
          <div className="panel-header">
            <h2>Executive Insights</h2>
            <span>{model.insights.length} signal(s)</span>
          </div>

          <div className="insight-list">
            {model.insights.map((insight) => (
              <div className={`insight-item insight-${insight.tone}`} key={insight.title}>
                <strong>{insight.title}</strong>
                <span>{insight.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function TrendView({
  comparisonColor,
  model,
  settings,
}: {
  comparisonColor: string;
  model: DashboardModel;
  settings: DashboardViewSettings;
}) {
  if (model.trendData.length === 0) {
    return <UnavailableView title="Trend Velocity" detail="Select a date field and measure to activate the trend chart." />;
  }

  if (settings.chartType === "bar") {
    return (
      <section className="panel chart-panel chart-panel-large dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
        <ChartHeader eyebrow="Temporal performance" title={settings.title} meta={`${model.trendData.length} point(s)`} />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={model.trendData} margin={{ top: 10, right: 12, left: 0, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" minTickGap={24} stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip content={<DashboardTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={settings.accentColor} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    );
  }

  if (settings.chartType === "line") {
    return (
      <section className="panel chart-panel chart-panel-large dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
        <ChartHeader eyebrow="Temporal performance" title={settings.title} meta={`${model.trendData.length} point(s)`} />
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={model.trendData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" minTickGap={24} stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip content={<DashboardTooltip />} />
            <Line type="monotone" dataKey="value" stroke={settings.accentColor} strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="comparison" dot={false} stroke={comparisonColor} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    );
  }

  return (
    <section className="panel chart-panel chart-panel-large dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Temporal performance</p>
          <h2>{settings.title}</h2>
        </div>
        <span>{model.trendData.length} point(s)</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={model.trendData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={settings.accentColor} stopOpacity={0.35} />
              <stop offset="95%" stopColor={settings.accentColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" minTickGap={24} stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip content={<DashboardTooltip />} />
          <Area type="monotone" dataKey="value" stroke={settings.accentColor} strokeWidth={3} fill="url(#valueGradient)" />
          <Line type="monotone" dataKey="comparison" dot={false} stroke={comparisonColor} strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

function CategoryBarView({ model, settings }: { model: DashboardModel; settings: DashboardViewSettings }) {
  if (model.categoryData.length === 0) {
    return <UnavailableView title="Top Categories" detail="Select a category field to activate grouped charts." />;
  }

  if (settings.chartType === "pie" || settings.chartType === "donut") {
    return <CategoryPieView model={model} settings={settings} />;
  }

  return (
    <section className="panel chart-panel dashboard-view" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ranked contribution</p>
          <h2>{settings.title}</h2>
        </div>
        <span>{model.categoryData.length} group(s)</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={model.categoryData} margin={{ top: 10, right: 12, left: 0, bottom: 35 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip content={<DashboardTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={settings.accentColor} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

function CategoryPieView({ model, settings }: { model: DashboardModel; settings: DashboardViewSettings }) {
  const pieData = model.categoryData.slice(0, 6);

  if (pieData.length === 0) {
    return <UnavailableView title="Category Share" detail="Select a category field to activate the mix chart." />;
  }

  return (
    <section className="panel chart-panel dashboard-view" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Portfolio mix</p>
          <h2>{settings.title}</h2>
        </div>
        <span>{pieData.length} slice(s)</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={settings.chartType === "pie" ? 0 : 58} outerRadius={88} paddingAngle={3}>
            {pieData.map((entry, index) => (
              <Cell key={entry.name} fill={index === 0 ? settings.accentColor : CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<DashboardTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}

function MeasureView({ model, settings }: { model: DashboardModel; settings: DashboardViewSettings }) {
  if (!model.measureSummary) {
    return <UnavailableView title="Measure Profile" detail="Select a numeric measure to activate distribution stats." />;
  }

  return (
    <section className="panel dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Distribution analysis</p>
          <h2>{settings.title}</h2>
        </div>
      </div>

      <div className="summary-strip">
        <MetricPill label="Minimum" value={model.measureSummary.min} />
        <MetricPill label="Average" value={model.measureSummary.average} />
        <MetricPill label="Median" value={model.measureSummary.median} />
        <MetricPill label="Maximum" value={model.measureSummary.max} />
        <MetricPill label="Std. Dev." value={model.measureSummary.standardDeviation} />
      </div>
    </section>
  );
}

function ColumnsView({ model, settings }: { model: DashboardModel; settings: DashboardViewSettings }) {
  return (
    <section className="panel dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Schema map</p>
          <h2>{settings.title}</h2>
        </div>
        <span>First {model.columnProfiles.length} fields</span>
      </div>

      <div className="profile-list">
        {model.columnProfiles.map((profile) => (
          <article className="profile-row" key={`${profile.name}-${profile.type}`}>
            <div>
              <strong>{profile.name}</strong>
              <span>{profile.type} · {profile.uniqueCount} unique · {profile.missingCount} blank</span>
            </div>
            <div className="progress-track" aria-label={`${profile.completeness}% complete`}>
              <span style={{ width: `${profile.completeness}%` }} />
            </div>
            <b>{profile.completeness}%</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function QualityView({ model, settings }: { model: DashboardModel; settings: DashboardViewSettings }) {
  return (
    <section className="panel dashboard-view" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Trust checks</p>
          <h2>{settings.title}</h2>
        </div>
      </div>

      <ul className="quality-list">
        {model.dataQualityMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}

function PreviewView({
  dataset,
  model,
  settings,
}: {
  dataset: WorkbookDataset;
  model: DashboardModel;
  settings: DashboardViewSettings;
}) {
  return (
    <section className="panel dashboard-view dashboard-view-wide" style={viewStyle(settings)}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Raw evidence</p>
          <h2>{settings.title}</h2>
        </div>
        <span>First {model.previewRows.length} rows</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {dataset.headers.slice(0, 6).map((header, index) => (
                <th key={`${header}-${index}`}>{header}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {model.previewRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {dataset.headers.slice(0, 6).map((_, columnIndex) => (
                  <td key={columnIndex}>{formatCell(row[columnIndex])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dataset.headers.length > 6 && (
        <p className="muted">Showing first 6 of {dataset.headers.length} columns.</p>
      )}
    </section>
  );
}

function UnavailableView({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="panel dashboard-view unavailable-view">
      <p className="eyebrow">Awaiting fields</p>
      <h2>{title}</h2>
      <p>{detail}</p>
    </section>
  );
}

function ChartHeader({ eyebrow, meta, title }: { eyebrow: string; meta: string; title: string }) {
  return (
    <div className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span>{meta}</span>
    </div>
  );
}

function viewStyle(settings: DashboardViewSettings): React.CSSProperties {
  return {
    "--view-accent": settings.accentColor,
  } as React.CSSProperties;
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entries = payload as Array<{ name?: string; value?: number; payload?: ChartPoint }>;

  return (
    <div className="chart-tooltip">
      <strong>{label ?? entries[0].payload?.name}</strong>
      {entries.map((entry) => (
        <span key={entry.name ?? "value"}>
          {entry.name ?? "value"}: {formatCell(entry.value)}
        </span>
      ))}
      {entries[0].payload?.share !== undefined && <span>Share: {entries[0].payload.share}%</span>}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-pill">
      <span>{label}</span>
      <strong>{formatCell(value)}</strong>
    </div>
  );
}

function formatLayout(layout: DashboardLayout): string {
  if (layout === "analyst") {
    return "Analyst deep dive";
  }

  if (layout === "compact") {
    return "Compact board";
  }

  return "Executive story";
}

function formatCategorySort(sortMode: string): string {
  if (sortMode === "valueAsc") {
    return "lowest values first";
  }

  if (sortMode === "nameAsc") {
    return "A to Z grouping";
  }

  if (sortMode === "shareDesc") {
    return "largest share first";
  }

  return "highest values first";
}

function formatViewName(viewId: DashboardViewId): string {
  if (viewId === "categoryBar") {
    return "Category bars";
  }

  if (viewId === "categoryPie") {
    return "Category share";
  }

  if (viewId === "health") {
    return "Health";
  }

  return viewId.charAt(0).toUpperCase() + viewId.slice(1);
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return String(value);
}
