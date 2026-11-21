import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Copy } from "../types";

// The left padding of a copy row's title cell, so its label lines up under the title's poster
// (the cell's own padding, the toggle and the gap after it)
export const COPY_TOGGLE_SPACE = "pl-13";

// The arrow before a title in the movie and TV tables that shows or hides its copies as rows
// underneath. A title with one copy (count 0) gets an empty space the same size, so every title
// lines up and nothing moves.
function CopyRowToggle({
  count,
  open,
  title,
  onToggle,
}: {
  count: number;
  open: boolean;
  title: string;
  onToggle: () => void;
}) {
  if (count === 0) return <span className="size-6 shrink-0" aria-hidden="true" />;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // A row that opens its drawer on click stays shut
        onToggle();
      }}
      aria-expanded={open}
      aria-label={`${open ? "Hide" : "Show"} the ${count} copies of ${title}`}
      title={`${count} copies`}
      className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
    </button>
  );
}

// A copy row's title cell: its name ("Copy 2", or a show's seasons) and where it lives
export function CopyRowLabel({ copy, index, name }: { copy: Copy; index: number; name?: string }) {
  const where = [
    copy.shelfSection || "Unshelved",
    copy.shelfNumber > 0 ? `#${copy.shelfNumber}` : null,
    copy.hdDriveNumber > 0 ? `HDD ${copy.hdDriveNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-foreground/85">{name ?? `Copy ${index + 1}`}</span>
      <span className="truncate text-xs text-muted-foreground">{where}</span>
    </span>
  );
}

export default CopyRowToggle;
