import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "table" | "poster";
export const VIEW_MODES = ["table", "poster"] as const;

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  showLabels?: boolean; // "Table" / "Posters" beside the icons on wide screens
  // Kept in the layout but hidden (e.g. on a tab it doesn't apply to), so nothing shifts
  hidden?: boolean;
  className?: string;
}

// The Table / Posters switch for lists of movies and TV shows
function ViewModeToggle({ value, onChange, showLabels = false, hidden = false, className }: ViewModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(mode) => mode && onChange(mode as ViewMode)}
      aria-label="View"
      aria-hidden={hidden || undefined}
      className={cn(hidden && "invisible", className)}
    >
      <ToggleGroupItem value="table" aria-label="Table view">
        <Table2 />
        {showLabels && <span className="hidden lg:inline">Table</span>}
      </ToggleGroupItem>
      <ToggleGroupItem value="poster" aria-label="Poster view">
        <LayoutGrid />
        {showLabels && <span className="hidden lg:inline">Posters</span>}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export default ViewModeToggle;
