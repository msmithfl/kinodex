import { useRef, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label?: string; // Shown in the list when it differs from the value
}

interface ChipSelectProps {
  values: string[];
  options: ChipOption[]; // Every choice; ones already picked are left out of the list
  onChange: (values: string[]) => void;
  className?: string; // Extra classes for the field (e.g. flex-1 beside a button)
  placeholder?: string; // Shown when nothing is picked
}

// A field showing picked values as removable chips; clicking it opens a list of the rest
// (genres, collections in the movie and TV forms)
export function ChipSelect({ values, options, onChange, className, placeholder }: ChipSelectProps) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const remaining = options.filter((option) => !values.includes(option.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={fieldRef}
          className={cn("rounded-md border border-input bg-card shadow-xs focus-within:border-ring", className)}
        >
          <div
            className="flex min-h-9 cursor-pointer flex-wrap items-center gap-2 px-3 py-1"
            onClick={() => setOpen((prev) => !prev)}
          >
            {values.length === 0 && placeholder && <span className="text-sm text-muted-foreground">{placeholder}</span>}
            {values.map((value, index) => (
              <span
                key={index}
                className="relative z-10 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-text"
              >
                {value}
                <button
                  type="button"
                  aria-label={`Remove ${value}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(values.filter((_, i) => i !== index));
                  }}
                  className="cursor-pointer opacity-70 transition hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </PopoverAnchor>

      {/* The list floats over the page, so it can cover the form's footer instead of being cut
          off by the form's scroll area, and opens upward when there's no room below. As wide as
          the field, about six rows tall, then it scrolls. */}
      <PopoverContent
        align="start"
        // Keeps focus where it was, e.g. not pulled into the list on phones
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // Clicking the field toggles the list itself, so it doesn't count as clicking outside
        onInteractOutside={(e) => {
          if (fieldRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className="max-h-[min(12.5rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) overflow-y-auto rounded-lg p-1"
      >
        <ul>
          {remaining.map((option) => (
            <li
              key={option.value}
              onClick={() => {
                onChange([...values, option.value]);
                setOpen(false);
              }}
              className="cursor-pointer rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              {option.label ?? option.value}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
