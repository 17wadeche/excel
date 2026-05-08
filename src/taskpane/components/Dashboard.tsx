import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardModel, WorkbookDataset } from "../types/dashboard";
import { KpiCard } from "./KpiCard";

interface DashboardProps {
  dataset: WorkbookDataset;
  model: DashboardModel;
}

export function Dashboard({ dataset, model }: DashboardProps) {
  return (
    <section className="dashboard">
      <section className="kpi-grid">
        {model.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      {model.trendData.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Trend</h2>
            <span>{model.trendData.length} point(s)</span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={model.trendData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={24} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {model.categoryData.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Top Categories</h2>
            <span>Top {model.categoryData.length}</span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={model.categoryData} margin={{ top: 10, right: 12, left: 0, bottom: 35 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Data Quality</h2>
        </div>

        <ul className="quality-list">
          {model.dataQualityMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Data Preview</h2>
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