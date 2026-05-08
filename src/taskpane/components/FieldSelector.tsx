import * as React from "react";
import { DataColumn } from "../types/dashboard";

interface FieldSelectorProps {
  label: string;
  value?: number;
  columns: DataColumn[];
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}

export function FieldSelector({
  label,
  value,
  columns,
  placeholder = "None",
  onChange,
}: FieldSelectorProps) {
  return (
    <label className="field-selector">
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue === "" ? undefined : Number(nextValue));
        }}
      >
        <option value="">{placeholder}</option>

        {columns.map((column) => (
          <option key={column.index} value={column.index}>
            {column.name}
          </option>
        ))}
      </select>
    </label>
  );
}