import { ArrowDown, ArrowDownWideNarrow, ArrowUp, ArrowUpNarrowWide, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

// The toolbar's sort menu: what to sort by. The current option has an arrow showing the direction
// (up for ascending), and choosing it again flips it. The button shows the current choice, with its
// icon showing the direction.
function SortMenu({
  sortBy,
  sortDirection,
  onSortByChange,
  onDirectionChange,
  options = MOVIE_SORT_OPTIONS,
}: SortMenuProps) {
  const label = options.find((o) => o.value === sortBy)?.label ?? "Sort";
  const DirectionIcon = sortDirection === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;
  const Arrow = sortDirection === "asc" ? ArrowUp : ArrowDown;
  const directionName = sortDirection === "asc" ? "ascending" : "descending";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Sorted by ${label}, ${directionName}`}
        >
          <DirectionIcon />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className="hidden text-muted-foreground in-data-[state=open]:text-primary-text sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {options.map((option) => {
          const active = option.value === sortBy;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={(e) => {
                if (!active) {
                  onSortByChange(option.value);
                  return;
                }
                // The current option flips the direction; the menu stays open to show the arrow turn
                e.preventDefault();
                onDirectionChange(sortDirection === "asc" ? "desc" : "asc");
              }}
              className={cn(active && "font-medium")}
            >
              {option.label}
              {active && (
                <>
                  <Arrow className="ml-auto" aria-hidden="true" />
                  <span className="sr-only">, {directionName}; choose again to reverse</span>
                </>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SortMenu;
