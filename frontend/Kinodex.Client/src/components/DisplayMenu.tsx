import { useId, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "./ViewModeToggle";

interface DisplayMenuProps<K extends string> {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // The table's optional columns, in table order, and which are showing
  columns: readonly { key: K; label: string }[];
  visibleColumns: Record<K, boolean>;
  onToggleColumn: (key: K) => void;
  // Titles with several copies start open (a row for each copy) or closed
  openCopies: boolean;
  onOpenCopiesChange: (open: boolean) => void;
}

// The toolbar's Display menu, beside Sort: Table or Posters, and for the table, a Columns row
// that opens the column checklist (like the Filter panel's lists) and whether titles with several
// copies start open. The table's options stay in place (greyed out) in poster view. The button's
// icon shows the current view.
function DisplayMenu<K extends string>({
  viewMode,
  onViewModeChange,
  columns,
  visibleColumns,
  onToggleColumn,
  openCopies,
  onOpenCopiesChange,
}: DisplayMenuProps<K>) {
  const id = useId();
  // Showing the column checklist rather than the main page
  const [choosingColumns, setChoosingColumns] = useState(false);
  const table = viewMode === "table";
  const ViewIcon = table ? Table2 : LayoutGrid;
  const shown = columns.filter(({ key }) => visibleColumns[key]).length;
  const columnSummary = shown === columns.length ? "All" : shown === 0 ? "None" : `${shown} of ${columns.length}`;

  return (
    <Popover onOpenChange={(open) => !open && setChoosingColumns(false)}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={`Display: ${table ? "table" : "posters"}`}>
          <ViewIcon />
          <span className="hidden sm:inline">Display</span>
        </Button>
      </PopoverTrigger>
      {/* Phones: the screen's width less 16px each side, kept 16px from the edges, so it sits
          centred; from sm up, 20rem from the button's left edge */}
      <PopoverContent align="start" collisionPadding={16} className="w-[calc(100vw-2rem)] p-0 sm:w-80">
        {choosingColumns ? (
          // The column checklist
          <div className="flex flex-col">
            <div className="flex items-center gap-1 px-2 py-2">
              <Button variant="ghost" size="icon-sm" onClick={() => setChoosingColumns(false)} aria-label="Back to display">
                <ChevronLeft />
              </Button>
              <span className="flex-1 text-sm font-semibold">Columns</span>
            </div>
            <Separator />
            <div className="p-1">
              {columns.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-accent"
                >
                  <Checkbox checked={visibleColumns[key]} onCheckedChange={() => onToggleColumn(key)} />
                  <span className="truncate">{label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
              <span className="text-sm font-semibold">Display</span>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(mode) => mode && onViewModeChange(mode as ViewMode)}
                aria-label="View"
                className="w-full"
              >
                <ToggleGroupItem value="table" className="flex-1">
                  <Table2 />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="poster" className="flex-1">
                  <LayoutGrid />
                  Posters
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Separator />
            {/* The table's options; greyed out, but still taking their space, in poster view */}
            <fieldset disabled={!table} className={cn("flex flex-col", !table && "opacity-50")}>
              <legend className="sr-only">Table</legend>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setChoosingColumns(true)}
                  className={cn(
                    "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm",
                    table && "cursor-pointer hover:bg-accent",
                  )}
                >
                  <span className="flex-1">Columns</span>
                  <span className="text-xs text-muted-foreground">{table ? columnSummary : "Table only"}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <label htmlFor={`${id}-open-copies`} className={cn("min-w-0", table && "cursor-pointer")}>
                  <span className="block text-sm">Open copies</span>
                  <span className="block text-xs text-muted-foreground">A row for each copy, to start with</span>
                </label>
                <Switch id={`${id}-open-copies`} checked={openCopies} onCheckedChange={onOpenCopiesChange} />
              </div>
            </fieldset>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default DisplayMenu;
