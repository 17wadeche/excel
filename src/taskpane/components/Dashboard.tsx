import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPoint, DashboardModel, WorkbookDataset } from "../types/dashboard";
import { KpiCard } from "./KpiCard";

interface DashboardProps {
  dataset: WorkbookDataset;
  model: DashboardModel;
}

const CATEGORY_COLORS = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

export function Dashboard({ dataset, model }: DashboardProps) {
  const pieData = model.categoryData.slice(0, 6);

  return (
    <section className="dashboard">
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
            <h2>Workbook health score</h2>
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

      {model.trendData.length > 0 && (
        <section className="panel chart-panel chart-panel-large">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Temporal performance</p>
              <h2>Trend Velocity</h2>
            </div>
            <span>{model.trendData.length} point(s)</span>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={model.trendData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" minTickGap={24} stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip content={<DashboardTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fill="url(#valueGradient)" />
              <Line type="monotone" dataKey="comparison" dot={false} stroke="#06b6d4" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="dashboard-grid-two">
        {model.categoryData.length > 0 && (
          <section className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Ranked contribution</p>
                <h2>Top Categories</h2>
              </div>
              <span>Top {model.categoryData.length}</span>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={model.categoryData} margin={{ top: 10, right: 12, left: 0, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip content={<DashboardTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {pieData.length > 0 && (
          <section className="panel chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Portfolio mix</p>
                <h2>Category Share</h2>
              </div>
              <span>{pieData.length} slice(s)</span>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DashboardTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </section>
        )}
      </section>

      {model.measureSummary && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Distribution analysis</p>
              <h2>{model.measureSummary.name} Profile</h2>
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
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Schema map</p>
            <h2>Column Intelligence</h2>
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Trust checks</p>
            <h2>Data Quality</h2>
          </div>
        </div>

        <ul className="quality-list">
          {model.dataQualityMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Raw evidence</p>
            <h2>Data Preview</h2>
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
    </section>
  );
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
