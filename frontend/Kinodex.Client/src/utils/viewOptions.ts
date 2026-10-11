import { FaImage } from "react-icons/fa";
import { FaTableList } from "react-icons/fa6";
import type { ViewToggleOption } from "../components/ViewToggle";

// Movies and TV Shows lists: a sortable table or a poster grid
export const TABLE_VIEW_OPTIONS = [
  { id: "table", label: "Table view", icon: FaTableList },
  { id: "poster", label: "Poster view", icon: FaImage },
] as const satisfies readonly ViewToggleOption<"table" | "poster">[];

// Collection and genre pages: detail cards or a poster grid
export const DETAIL_VIEW_OPTIONS = [
  { id: "detail", label: "Detail view", icon: FaTableList },
  { id: "poster", label: "Poster view", icon: FaImage },
] as const satisfies readonly ViewToggleOption<"detail" | "poster">[];
