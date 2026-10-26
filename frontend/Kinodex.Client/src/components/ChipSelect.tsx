import { useEffect, useRef, useState } from "react";

export interface ChipOption {
  value: string;
  label?: string; // Shown in the list when it differs from the value (e.g. "4K Ultra HD")
}

// The open/close behaviour every chip field shares: clicking the field toggles its list, and
// clicking anywhere outside it closes the list
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

const fieldClass = "relative bg-gray-700 border border-gray-600 focus-within:border-gray-500";
const listClass = "absolute top-full left-0 w-full overflow-y-auto bg-gray-800 border border-gray-600 z-50";
const itemClass = "px-3 py-2 text-white text-sm hover:bg-gray-600 cursor-pointer";
const chipBase = "inline-flex items-center gap-1 px-3 py-1 text-white rounded-full text-sm relative z-10";

interface ChipSelectProps {
  values: string[];
  options: ChipOption[]; // Every choice; ones already picked are left out of the list
  onChange: (values: string[]) => void;
  chipColor?: string; // Tailwind background class for the chips
  listHeight?: string; // Tailwind max-height class for the list
  rowPadding?: string; // Tailwind vertical padding class for the chip row
  className?: string; // Extra classes for the field (e.g. flex-1 beside a button)
}

// A field showing picked values as removable chips; clicking it opens a list of the rest
export function ChipSelect({
  values,
  options,
  onChange,
  chipColor = "bg-indigo-600",
  listHeight = "max-h-30",
  rowPadding = "py-1",
  className = "",
}: ChipSelectProps) {
  const { open, setOpen, ref } = useDropdown();
  const remaining = options.filter((option) => !values.includes(option.value));

  return (
    <div ref={ref} className={`${fieldClass} ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-2 px-3 ${rowPadding} min-h-10.5 cursor-pointer`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {values.map((value, index) => (
          <span key={index} className={`${chipBase} ${chipColor}`}>
            {value}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(values.filter((_, i) => i !== index));
              }}
              className="hover:text-red-300 transition cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {open && (
        <ul className={`${listClass} ${listHeight}`}>
          {remaining.map((option) => (
            <li
              key={option.value}
              onClick={() => {
                onChange([...values, option.value]);
                setOpen(false);
              }}
              className={itemClass}
            >
              {option.label ?? option.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SingleChipSelectProps {
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
  className?: string;
}

// The same field for one value (e.g. the shelf section): its chip opens the list of choices
export function SingleChipSelect({ value, options, onChange, className = "" }: SingleChipSelectProps) {
  const { open, setOpen, ref } = useDropdown();

  return (
    <div ref={ref} className={`${fieldClass} ${className}`}>
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-1 min-h-10.5 cursor-pointer"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`${chipBase} bg-indigo-600`}>{value}</span>
      </div>

      {open && (
        <ul className={`${listClass} max-h-30`}>
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={itemClass}
            >
              {option.label ?? option.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
