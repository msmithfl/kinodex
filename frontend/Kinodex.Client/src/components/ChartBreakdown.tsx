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
import { ChartPie, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CHART_TOOLTIP, labelColorOn } from "../utils/chartColors";

// Each slice's percentage, in whichever text colour reads on it; slices under 5% go without
const percentLabel = (colors: string[]) =>
  function PercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: PieLabelRenderProps) {
    const pct = percent as number;
    if (pct < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.5;
    const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
    const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill={labelColorOn(colors[(index as number) % colors.length])}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(pct * 100).toFixed(0)}%`}
      </text>
    );
  };

function DataTable({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="max-h-75 overflow-y-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="border-b border-border py-2 pr-4 font-medium">Name</th>
            <th className="border-b border-border py-2 pr-4 text-right font-medium">Count</th>
            <th className="border-b border-border py-2 pr-1 text-right font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.name}>
              <td className="border-b border-border/60 py-2 pr-4">{row.name}</td>
              <td className="border-b border-border/60 py-2 pr-4 text-right text-foreground/85 tabular-nums">
                {row.value}
              </td>
              <td className="border-b border-border/60 py-2 pr-1 text-right text-muted-foreground tabular-nums">
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
  colors: string[]; // One per row of data, from utils/chartColors
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
    <div className="min-w-0 rounded-xl border border-border bg-card p-5">
      {/* min-h-9 matches the Monthly Spending header, whose month pickers make it taller */}
      <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <ToggleGroup
          type="single"
          value={showTable ? "table" : "donut"}
          onValueChange={(view) => view && setShowTable(view === "table")}
          aria-label="View"
        >
          <ToggleGroupItem value="donut" aria-label="Donut chart">
            <ChartPie />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table">
            <Table2 />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Dataset picker; a divider separates it from the chart (below it on mobile, beside it from tablet up) */}
        <nav
          aria-label={`${title} data`}
          className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border pb-3 md:w-32 md:flex-col md:overflow-visible md:border-r md:border-b-0 md:pr-4 md:pb-0"
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              data-slot="breakdown-option"
              onClick={() => select(option.id)}
              aria-pressed={option.id === selected.id}
              className={cn(
                "shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-left text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                option.id === selected.id
                  ? "bg-primary-soft text-primary-text"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : showTable ? (
            <DataTable data={fullData} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={76}
                  outerRadius={110}
                  paddingAngle={2}
                  cornerRadius={3}
                  stroke="none"
                  dataKey="value"
                  labelLine={false}
                  label={percentLabel(colors)}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value: number | undefined, name) => [countLabel(value ?? 0), name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
