import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortOption } from "@/types";

export interface SortMenuOption {
  value: SortOption;
  label: string;
}

// Movie sort options; other lists pass their own
const MOVIE_SORT_OPTIONS: SortMenuOption[] = [
  { value: "alphabetic", label: "Title" },
  { value: "year", label: "Year" },
  { value: "format", label: "Format" },
  { value: "condition", label: "Condition" },
  { value: "rating", label: "Rating" },
  { value: "purchasePrice", label: "Purchase price" },
  { value: "date", label: "Date added" },
];

interface SortMenuProps {
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSortByChange: (sortBy: SortOption) => void;
  onDirectionChange: (direction: "asc" | "desc") => void;
  options?: SortMenuOption[];
}

// The toolbar's sort menu: what to sort by, then ascending or descending. The button shows the
// current choice, with its icon showing the direction.
function SortMenu({
  sortBy,
  sortDirection,
  onSortByChange,
  onDirectionChange,
  options = MOVIE_SORT_OPTIONS,
}: SortMenuProps) {
  const label = options.find((o) => o.value === sortBy)?.label ?? "Sort";
  const DirectionIcon = sortDirection === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Sorted by ${label}, ${sortDirection === "asc" ? "ascending" : "descending"}`}
        >
          <DirectionIcon />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className="hidden text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortByChange(v as SortOption)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(v) => onDirectionChange(v as "asc" | "desc")}
        >
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SortMenu;
