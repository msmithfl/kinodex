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

export interface BreakdownOption {
  id: string;
  label: string;
  data: { name: string; value: number }[];
  fullData?: { name: string; value: number }[]; // Shown in the table view, e.g. every genre rather than the top 8
  colors: string[];
}

interface ChartBreakdownProps {
  title: string;
  options: BreakdownOption[];
  storageKey: string; // Remembers the chosen option between visits
  countLabel?: (count: number) => string; // Tooltip text for a slice's count
}

// One donut chart with a list of datasets to choose from: a sidebar on wider screens,
// a sideways-scrolling row of pills on mobile
export default function ChartBreakdown({
  title,
  options,
  storageKey,
  countLabel = (n) => `${n} movie${n !== 1 ? "s" : ""}`,
}: ChartBreakdownProps) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) ?? options[0]?.id ?? "";
    } catch {
      return options[0]?.id ?? "";
    }
  });
  const [showTable, setShowTable] = useState(false);

  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  const select = (id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // Storage unavailable; the choice just isn't remembered
    }
  };

  if (!selected) return null;
  const { data, fullData = data, colors } = selected;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* min-h-9 matches the Monthly Spending header, whose month pickers make it taller */}
      {/* Styled to mirror the Monthly Spending header and its From/To pickers */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 min-h-9 pb-3 border-b border-gray-700">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-3 text-sm">
          <label htmlFor={`${storageKey}-view`} className="text-gray-400">
            View
          </label>
          <select
            id={`${storageKey}-view`}
            value={showTable ? "table" : "donut"}
            onChange={(e) => setShowTable(e.target.value === "table")}
            className="bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-indigo-500"
          >
            <option value="donut">Donut</option>
            <option value="table">Table</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Dataset picker; a divider separates it from the chart (below it on mobile, beside it from tablet up) */}
        <nav
          aria-label={`${title} data`}
          className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-32 shrink-0 pb-3 border-b border-gray-700 md:pb-0 md:border-b-0 md:pr-4 md:border-r"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => select(option.id)}
              aria-pressed={option.id === selected.id}
              className={`shrink-0 whitespace-nowrap text-left px-3 py-1.5 text-sm font-medium rounded-md transition cursor-pointer ${
                option.id === selected.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {data.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No data yet.</p>
          ) : showTable ? (
            <DataTable data={fullData} />
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
                  }}
                  formatter={(value: number | undefined) => [
                    countLabel(value ?? 0),
                    "",
                  ]}
                />
                <Legend wrapperStyle={{ color: "#d1d5db" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
