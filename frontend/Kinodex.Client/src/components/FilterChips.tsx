import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterCategory } from "@/utils/filterCategories";

interface FilterChipsProps {
  categories: FilterCategory[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
  onReset: () => void;
}

// What one category's chip says: a yes/no filter is just its choice ("Not watched"); others are
// "Genre: Drama, Horror +1"
function chipText(category: FilterCategory, values: string[]) {
  const labels = values.map((v) => category.options.find((o) => o.value === v)?.label ?? v);
  if (category.kind === "toggle") return { label: null, value: labels.join(", ") };
  const shown = labels.slice(0, 2).join(", ");
  return { label: category.label, value: labels.length > 2 ? `${shown} +${labels.length - 2}` : shown };
}

// The active filters under the toolbar, one removable chip per category, then Clear all. Nothing
// when no filter is set. Scrolls sideways on phones rather than wrapping.
function FilterChips({ categories, selectedFilters, onFilterChange, onReset }: FilterChipsProps) {
  const active = categories.filter((c) => (selectedFilters[c.id] ?? []).length > 0);
  if (active.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-6 flex items-center gap-2 overflow-x-auto px-6 md:mx-0 md:flex-wrap md:px-0">
      {active.map((category) => {
        const { label, value } = chipText(category, selectedFilters[category.id]);
        return (
          <span
            key={category.id}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border bg-card pr-1 pl-3 text-xs"
          >
            {label && <span className="text-muted-foreground">{label}</span>}
            <span>{value}</span>
            <button
              type="button"
              onClick={() => onFilterChange(category.id, [])}
              aria-label={`Remove the ${category.label} filter`}
              className="grid size-5 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}
      <Button variant="link" size="sm" className="h-7 shrink-0 px-1.5 text-xs" onClick={onReset}>
        Clear all
      </Button>
    </div>
  );
}

export default FilterChips;
