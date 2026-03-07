import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelRenderProps) {
  const cxN = cx as number;
  const cyN = cy as number;
  const midAngleN = midAngle as number;
  const innerR = innerRadius as number;
  const outerR = outerRadius as number;
  const pct = percent as number;
  if (pct < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerR + (outerR - innerR) * 0.5;
  const x = cxN + radius * Math.cos(-midAngleN * RADIAN);
  const y = cyN + radius * Math.sin(-midAngleN * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
    >
      {`${(pct * 100).toFixed(0)}%`}
    </text>
  );
}

function DataTable({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="overflow-y-auto max-h-75">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800">
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium text-right">Count</th>
            <th className="pb-2 pr-4 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.name} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 pr-4 text-white">{row.name}</td>
              <td className="py-2 pr-4 text-gray-300 text-right">{row.value}</td>
              <td className="py-2 pr-4 text-gray-300 text-right">
                {total > 0 ? ((row.value / total) * 100).toFixed(1) : "0"}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChartCard({
  title,
  data,
  colors,
  tooltipStyle,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
  tooltipStyle?: React.CSSProperties;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={() => setShowTable((p) => !p)}
          className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1 transition-colors"
        >
          {showTable ? "Donut" : "Table"}
        </button>
      </div>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No data yet.</p>
      ) : showTable ? (
        <DataTable data={data} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                color: "#000",
                ...tooltipStyle,
              }}
              formatter={(value: number | undefined) => [
                `${value ?? 0} movie${(value ?? 0) !== 1 ? "s" : ""}`,
                "",
              ]}
            />
            <Legend wrapperStyle={{ color: "#d1d5db" }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}