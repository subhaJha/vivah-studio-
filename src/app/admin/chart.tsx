"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function Chart({
  data,
  label,
}: {
  data: { name: string; value: number }[];
  label: string;
}) {
  return (
    <div
      className="h-56 min-w-0"
      role="img"
      aria-label={data.map((row) => row.name + ": " + row.value).join(", ")}
    >
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#eadfd8" />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis allowDecimals={false} fontSize={11} />
          <Tooltip />
          <Bar
            name={label}
            dataKey="value"
            fill="#7c243e"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
