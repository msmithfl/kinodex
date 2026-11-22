import { useEffect, useId, useRef, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { matchOptions } from "../utils/matchOptions";

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

const labelOf = (option: ChipOption) => option.label ?? option.value;

// A field showing picked values as removable chips, with a box after them to type in: typing
// narrows the list of the rest; ↑ ↓ move through it, Enter picks, Backspace in the empty box takes
// off the last chip, Escape closes the list. Clicking picks too, and the list stays open for the
// next one. (Genres and collections in the movie and TV forms, and collections in bulk edit.)
export function ChipSelect({ values, options, onChange, className, placeholder }: ChipSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const matches = matchOptions(
    options.filter((option) => !values.includes(option.value)),
    query,
  );
  const activeIndex = Math.min(active, matches.length - 1);

  // Keep the highlighted option in view while moving through a long list with the arrow keys
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const pick = (option: ChipOption) => {
    onChange([...values, option.value]);
    setQuery("");
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(Math.max(0, Math.min(matches.length - 1, activeIndex + step)));
    } else if (e.key === "Enter") {
      // Never submits the form around it
      e.preventDefault();
      if (open && matches[activeIndex]) pick(matches[activeIndex]);
    } else if (e.key === "Backspace" && query === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={fieldRef}
          className={cn("rounded-md border border-input bg-card shadow-xs focus-within:border-ring", className)}
        >
          <div
            className="flex min-h-9 cursor-text flex-wrap items-center gap-2 px-3 py-1"
            onClick={() => {
              inputRef.current?.focus();
              setOpen(true);
            }}
          >
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
            <input
              ref={inputRef}
              // The field around it shows the focus (its border), so no focus ring of its own
              data-slot="chip-select-input"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              aria-label={placeholder ?? "Add"}
              value={query}
              placeholder={values.length === 0 ? placeholder : undefined}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
              }}
              onKeyDown={onKeyDown}
              // 16px text on phones, as in the other inputs: iOS zooms in on smaller text on focus
              className="h-7 min-w-24 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
        </div>
      </PopoverAnchor>

      {/* The list floats over the page, so it can cover the form's footer instead of being cut
          off by the form's scroll area, and opens upward when there's no room below. As wide as
          the field, about six rows tall, then it scrolls. */}
      <PopoverContent
        align="start"
        // Keeps focus in the box being typed in
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // Clicking or typing in the field doesn't count as leaving it
        onInteractOutside={(e) => {
          if (fieldRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className="max-h-[min(12.5rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) overflow-y-auto rounded-lg p-1"
      >
        <ul ref={listRef} id={listId} role="listbox">
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // Picking leaves the focus in the box, ready for the next one
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(option)}
              className={cn("cursor-pointer rounded-md px-2 py-1.5 text-sm", index === activeIndex && "bg-accent")}
            >
              {labelOf(option)}
            </li>
          ))}
          {matches.length === 0 && (
            <li role="presentation" className="px-2 py-1.5 text-sm text-muted-foreground">
              {query.trim() ? `Nothing matches “${query.trim()}”` : "Nothing left to add"}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
