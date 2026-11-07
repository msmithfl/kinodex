import { useState } from "react";
import { ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FilterCategory } from "@/utils/filterCategories";

interface FilterPanelProps {
  categories: FilterCategory[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
  onReset: () => void;
  // The footer button's label, e.g. "Show 42 movies"
  resultLabel: string;
}

// What a list category's row shows on the right: Any, the one value picked, or how many
function listSummary(category: FilterCategory, values: string[]) {
  if (values.length === 0) return "Any";
  if (values.length === 1) return category.options.find((o) => o.value === values[0])?.label ?? "1 selected";
  return `${values.length} selected`;
}

// The Filter button and its panel. Format is a row of pills; yes/no filters are Any / Yes / No
// switches; the longer lists (genre, collection, shelf, ...) open a checklist inside the panel.
// Filters apply as they're picked; the footer button just closes the panel.
function FilterPanel({ categories, selectedFilters, onFilterChange, onReset, resultLabel }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  // The list category whose checklist is showing, or null for the main view
  const [listId, setListId] = useState<string | null>(null);

  const activeCount = Object.values(selectedFilters).reduce((sum, values) => sum + values.length, 0);
  const selected = (id: string) => selectedFilters[id] ?? [];
  const toggleValue = (id: string, value: string) => {
    const values = selected(id);
    onFilterChange(id, values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  const pills = categories.filter((c) => c.kind === "pills");
  const toggles = categories.filter((c) => c.kind === "toggle");
  const lists = categories.filter((c) => (c.kind ?? "list") === "list");
  const openList = lists.find((c) => c.id === listId);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setListId(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={`Filters${activeCount ? `, ${activeCount} active` : ""}`}>
          <ListFilter />
          <span className="hidden sm:inline">Filter</span>
          {activeCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-soft px-1 text-[11px] font-semibold text-primary-text">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        {openList ? (
          // One list category's checklist
          <div className="flex flex-col">
            <div className="flex items-center gap-1 px-2 py-2">
              <Button variant="ghost" size="icon-sm" onClick={() => setListId(null)} aria-label="Back to filters">
                <ChevronLeft />
              </Button>
              <span className="flex-1 text-sm font-semibold">{openList.label}</span>
              {selected(openList.id).length > 0 && (
                <Button variant="link" size="sm" onClick={() => onFilterChange(openList.id, [])}>
                  Clear
                </Button>
              )}
            </div>
            <Separator />
            <div className="max-h-72 overflow-y-auto p-1">
              {openList.options.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Nothing to filter by yet.</p>
              ) : (
                openList.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected(openList.id).includes(option.value)}
                      onCheckedChange={() => toggleValue(openList.id, option.value)}
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-sm font-semibold">Filters</span>
              <Button variant="link" size="sm" className="h-auto px-0" onClick={onReset} disabled={activeCount === 0}>
                Reset
              </Button>
            </div>

            {pills.map((category) => (
              <div key={category.id} className="flex flex-col gap-2 px-4 pt-1 pb-3">
                <span className="text-xs font-medium text-muted-foreground">{category.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {category.options.map((option) => {
                    const on = selected(category.id).includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleValue(category.id, option.value)}
                        className={cn(
                          "h-7 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors",
                          on
                            ? "border-primary bg-primary-soft text-primary-text"
                            : "border-border text-foreground/85 hover:bg-accent",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {toggles.map((category) => {
              const value = selected(category.id)[0] ?? "any";
              return (
                <div key={category.id} className="flex items-center justify-between gap-3 px-4 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{category.label}</span>
                  <ToggleGroup
                    type="single"
                    value={value}
                    onValueChange={(next) => onFilterChange(category.id, next && next !== "any" ? [next] : [])}
                    aria-label={category.label}
                  >
                    <ToggleGroupItem value="any" className="h-6 px-2 text-xs">Any</ToggleGroupItem>
                    <ToggleGroupItem value="true" className="h-6 px-2 text-xs">Yes</ToggleGroupItem>
                    <ToggleGroupItem value="false" className="h-6 px-2 text-xs">No</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              );
            })}

            {lists.length > 0 && (
              <>
                <Separator className="mt-2" />
                <div className="p-1">
                  {lists.map((category) => {
                    const values = selected(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setListId(category.id)}
                        className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-accent"
                      >
                        <span className="flex-1">{category.label}</span>
                        <span
                          className={cn(
                            "max-w-32 truncate text-xs",
                            values.length ? "text-primary-text" : "text-muted-foreground",
                          )}
                        >
                          {listSummary(category, values)}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <Separator />
            <div className="p-3">
              <Button className="w-full" onClick={() => setOpen(false)}>
                {resultLabel}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default FilterPanel;
