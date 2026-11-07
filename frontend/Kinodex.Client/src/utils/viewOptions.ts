import { FaChartPie } from "react-icons/fa";
import { FaTableList } from "react-icons/fa6";
import type { ViewToggleOption } from "../components/ViewToggle";

// Stats breakdown: a donut chart or a table of the same figures
export const CHART_VIEW_OPTIONS = [
  { id: "donut", label: "Donut chart", icon: FaChartPie },
  { id: "table", label: "Table", icon: FaTableList },
] as const satisfies readonly ViewToggleOption<"donut" | "table">[];
