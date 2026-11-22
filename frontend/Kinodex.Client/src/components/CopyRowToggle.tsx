import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Copy } from "../types";

// After a title in the movie and TV tables, when it has several copies: a small chip with how many
// and an arrow, which shows or hides them as rows underneath. Nothing at all for a title with one
// copy (count 0), so no row keeps space for it.
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
  if (count === 0) return null;
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
      className="inline-flex h-5 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-border pr-1 pl-1.5 text-xs text-muted-foreground tabular-nums transition-colors hover:bg-accent hover:text-foreground"
    >
      {count}
      <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
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
