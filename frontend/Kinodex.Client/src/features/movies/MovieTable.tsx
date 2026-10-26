import { Link } from "react-router-dom";
import { FaRegCircle, FaCheckCircle } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import { LuTable2 } from "react-icons/lu";
import SortableTableHeader from "../../components/SortableTableHeader";
import { Stars } from "../../components/StarRating";
import { getRelativeTimeString } from "../../utils/dateUtils";
import type { Movie, SortOption } from "../../types";
import type { VisibleColumns } from "./tableColumns";

// Menu label and sort key for each optional column, in table order
const COLUMNS: { key: keyof VisibleColumns; label: string; sortKey: SortOption }[] = [
  { key: "year", label: "Year", sortKey: "year" },
  { key: "format", label: "Format", sortKey: "format" },
  { key: "condition", label: "Condition", sortKey: "condition" },
  { key: "rating", label: "Rating", sortKey: "rating" },
  { key: "purchasePrice", label: "Purchase Price", sortKey: "purchasePrice" },
  { key: "dateAdded", label: "Date Added", sortKey: "date" },
];

interface MovieTableProps {
  movies: Movie[]; // Already filtered, searched and sorted
  visibleColumns: VisibleColumns;
  onToggleColumn: (column: keyof VisibleColumns) => void;
  showColumnMenu: boolean;
  onShowColumnMenu: (show: boolean) => void;
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
  selectedIds: Set<number>;
  onSelect: (movieId: number | undefined, selected: boolean) => void;
  onOpen: (movieId?: number) => void;
}

// The movie list's table: a column menu, sortable headers, and rows with a selection circle and a
// title that opens the movie's drawer
function MovieTable({
  movies,
  visibleColumns,
  onToggleColumn,
  showColumnMenu,
  onShowColumnMenu,
  sortBy,
  sortDirection,
  onSort,
  selectedIds,
  onSelect,
  onOpen,
}: MovieTableProps) {
  return (
    <div className="h-full bg-gray-900 overflow-x-auto overflow-y-hidden overscroll-x-contain">
      {/* Two scroll areas so a swipe moves the table one way at a time: the outer one only
          scrolls sideways, the inner one only up and down. Touch browsers lock each gesture
          to the area matching its starting direction. The vertical one is inside so the
          sticky header still sticks, while moving sideways with the columns. */}
      <div className="h-full w-max min-w-full overflow-y-auto overflow-x-hidden overscroll-y-contain">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 w-12 border-r border-gray-600">
                <div className="relative">
                  <button
                    onClick={() => onShowColumnMenu(!showColumnMenu)}
                    className="flex text-gray-300 hover:text-white transition-colors cursor-pointer items-center"
                    aria-label="Column options"
                  >
                    <LuTable2 className="w-5 h-5" />
                  </button>
                  {showColumnMenu && (
                    <div className="text-sm absolute -left-1 mt-2 w-40 border border-gray-600 rounded-md bg-gray-800 shadow-lg z-10">
                      {COLUMNS.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => onToggleColumn(key)}
                          className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-4 py-2"
                        >
                          <span
                            className={`font-normal ${visibleColumns[key] ? "text-indigo-400" : "text-white"}`}
                          >
                            {label}
                          </span>
                          {visibleColumns[key] && <FaCheck className="w-5 h-5 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              <SortableTableHeader
                label="Title"
                sortKey="alphabetic"
                currentSortBy={sortBy}
                sortDirection={sortDirection}
                onClick={onSort}
                className="w-46 max-w-46 md:w-96 md:max-w-96"
              />
              {COLUMNS.filter(({ key }) => visibleColumns[key]).map(({ key, label, sortKey }) => (
                <SortableTableHeader
                  key={key}
                  label={label}
                  sortKey={sortKey}
                  currentSortBy={sortBy}
                  sortDirection={sortDirection}
                  onClick={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {movies.map((movie, index) => (
              <tr
                key={movie.id}
                className={`text-sm group ${index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"} hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus-within:outline-none`}
              >
                <td
                  className="w-12 text-center"
                  onClick={() => onSelect(movie.id, !selectedIds.has(movie.id || 0))}
                >
                  {selectedIds.has(movie.id || 0) ? (
                    <FaCheckCircle className="w-5 h-5 text-indigo-500 inline-block" />
                  ) : (
                    <FaRegCircle
                      className={`w-4 h-4 text-gray-500 transition-opacity opacity-0 group-hover:opacity-100 inline-block`}
                    />
                  )}
                </td>
                <td className="px-6 py-2 text-white w-46 max-w-46 md:w-96 md:max-w-96 align-middle">
                  <Link
                    to={`/movie/${movie.id}`}
                    onClick={(e) => {
                      // Plain clicks open the drawer; ctrl/cmd-click still opens the full page in a new tab
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      onOpen(movie.id);
                    }}
                    className="hover:underline transition-colors inline-block truncate max-w-full align-middle"
                    title={movie.title}
                  >
                    {movie.title}
                  </Link>
                </td>
                {visibleColumns.year && (
                  <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                    {movie.year || "-"}
                  </td>
                )}
                {visibleColumns.format && (
                  <td className="px-6 py-2 whitespace-nowrap align-middle">
                    {movie.formats && movie.formats.length > 0 ? (
                      <div className="flex gap-1">
                        {[...movie.formats].sort().map((fmt, idx) => (
                          <span key={idx}>
                            {fmt}
                            {idx < movie.formats.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                )}
                {visibleColumns.condition && (
                  <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                    {movie.condition}
                  </td>
                )}
                {visibleColumns.rating && (
                  <td className="pl-6 py-2 whitespace-nowrap align-middle">
                    <div className="flex gap-0.5">
                      <Stars rating={movie.rating} />
                    </div>
                  </td>
                )}
                {visibleColumns.purchasePrice && (
                  <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                    {movie.purchasePrice ? `$${movie.purchasePrice.toFixed(2)}` : "-"}
                  </td>
                )}
                {visibleColumns.dateAdded && (
                  <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                    {getRelativeTimeString(movie.createdAt)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MovieTable;
