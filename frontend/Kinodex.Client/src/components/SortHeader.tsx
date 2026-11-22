import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/types";

interface SortHeaderProps {
  label: string;
  sortKey: SortOption;
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: SortOption) => void;
  className?: string;
  // Before the label, in the same cell (e.g. the movie table's select-all, over the posters)
  before?: ReactNode;
}

// A redesigned table's column header that sorts by its column; the arrow shows on the sorted one
// (and faintly on hover). The movie and TV tables share it.
function SortHeader({ label, sortKey, sortBy, sortDirection, onSort, className, before }: SortHeaderProps) {
  const active = sortBy === sortKey;
  const Arrow = sortDirection === "asc" ? ArrowUp : ArrowDown;
  const button = (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "group/sort inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <Arrow className={cn("size-3", active ? "" : "opacity-0 group-hover/sort:opacity-50")} />
    </button>
  );
  return (
    <th
      className={cn(
        "border-b border-border px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap",
        className,
      )}
      aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
    >
      {before ? (
        <div className="flex items-center gap-3">
          {before}
          {button}
        </div>
      ) : (
        button
      )}
    </th>
  );
}

export default SortHeader;
