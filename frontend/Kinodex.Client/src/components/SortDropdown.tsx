import { useState, useRef, useEffect } from "react";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";
import { FaArrowUpShortWide, FaArrowDownWideShort } from "react-icons/fa6";
import type { SortOption } from "../types";

export interface SortDropdownOption {
  value: SortOption;
  label: string;
}

// Movie sort options; other lists (e.g. TV shows) pass their own
const SORT_OPTIONS: SortDropdownOption[] = [
  { value: "alphabetic", label: "Title" },
  { value: "year", label: "Year" },
  { value: "format", label: "Format" },
  { value: "condition", label: "Condition" },
  { value: "rating", label: "Rating" },
  { value: "purchasePrice", label: "Purchase Price" },
  { value: "date", label: "Date Added" },
];

interface SortDropdownProps {
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  // Same behaviour as clicking a table header: a new option sorts ascending,
  // the current option flips the direction
  onSortChange: (sortBy: SortOption) => void;
  options?: SortDropdownOption[];
}

// Sorting for views without sortable table headers; styled to match FilterDropdown
function SortDropdown({
  sortBy,
  sortDirection,
  onSortChange,
  options = SORT_OPTIONS,
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const DirectionIcon = sortDirection === "asc" ? FaArrowUp : FaArrowDown;
  // The button's icon shows the direction too: short-to-wide bars for ascending, wide-to-short for descending
  const ButtonIcon =
    sortDirection === "asc" ? FaArrowUpShortWide : FaArrowDownWideShort;
  const currentLabel =
    options.find((o) => o.value === sortBy)?.label ?? "Sort";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Sorted by ${currentLabel}, ${sortDirection === "asc" ? "ascending" : "descending"}`}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white hover:border-gray-500 transition-colors cursor-pointer"
      >
        <ButtonIcon className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="text-sm absolute left-0 mt-2 w-46 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20">
          {options.map((option) => {
            const isSelected = option.value === sortBy;
            return (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                aria-pressed={isSelected}
                className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors flex items-center justify-between cursor-pointer"
              >
                <span className={isSelected ? "text-indigo-400" : "text-white"}>
                  {option.label}
                </span>
                {isSelected && (
                  <DirectionIcon
                    className="w-3 h-3 text-indigo-400"
                    title={sortDirection === "asc" ? "Ascending" : "Descending"}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SortDropdown;
