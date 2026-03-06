import { FaArrowUp, FaArrowDown } from "react-icons/fa";

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSortBy: string;
  sortDirection: "asc" | "desc";
  onClick: (sortKey: string) => void;
  className?: string;
}

function SortableTableHeader({
  label,
  sortKey,
  currentSortBy,
  sortDirection,
  onClick,
  className = "",
}: SortableTableHeaderProps) {
  const isActive = currentSortBy === sortKey;

  return (
    <th
      onClick={() => onClick(sortKey)}
      className={`px-6 py-2 text-left text-sm font-semibold text-gray-200 border-r border-gray-600 hover:text-white transition-colors cursor-pointer focus:outline-none active:border-gray-600 whitespace-nowrap ${className}`}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortDirection === "asc" ? (
          <FaArrowUp className={`w-3 h-3 ${isActive ? "" : "invisible"}`} />
        ) : (
          <FaArrowDown className={`w-3 h-3 ${isActive ? "" : "invisible"}`} />
        )}
      </div>
    </th>
  );
}

export default SortableTableHeader;
