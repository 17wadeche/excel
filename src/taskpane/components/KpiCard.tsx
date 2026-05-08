import * as React from "react";
import { Kpi } from "../types/dashboard";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <article className={`kpi-card kpi-card-${kpi.tone ?? "blue"}`}>
      <div className="kpi-label">{kpi.label}</div>
      <div className="kpi-value">{formatValue(kpi.value)}</div>
      {kpi.helper && <div className="kpi-helper">{kpi.helper}</div>}
    </article>
  );
}

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return value;
}
