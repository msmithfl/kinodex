import { useEffect, useRef, useState } from "react";

export interface ChipOption {
  value: string;
  label?: string; // Shown in the list when it differs from the value
}

// The open/close behaviour: clicking the field toggles its list, and clicking anywhere outside it
// closes the list
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  return { open, setOpen, ref };
}

interface ChipSelectProps {
  values: string[];
  options: ChipOption[]; // Every choice; ones already picked are left out of the list
  onChange: (values: string[]) => void;
  listHeight?: string; // Tailwind max-height class for the list
  className?: string; // Extra classes for the field (e.g. flex-1 beside a button)
  placeholder?: string; // Shown when nothing is picked
}

// A field showing picked values as removable chips; clicking it opens a list of the rest
// (genres, collections in the movie and TV forms)
export function ChipSelect({
  values,
  options,
  onChange,
  listHeight = "max-h-30",
  className = "",
  placeholder,
}: ChipSelectProps) {
  const { open, setOpen, ref } = useDropdown();
  const remaining = options.filter((option) => !values.includes(option.value));

  return (
    <div
      ref={ref}
      className={`relative rounded-md border border-input bg-card shadow-xs focus-within:border-ring ${className}`}
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

      {open && (
        <ul
          className={`absolute top-full left-0 z-50 mt-1 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg ${listHeight}`}
        >
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
      )}
    </div>
  );
}
