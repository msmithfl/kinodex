import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import SortHeader from "../../components/SortHeader";
import { QuickRating } from "../../components/StarRating";
import { useRateMovie } from "./api";
import { getRelativeTimeString } from "../../utils/dateUtils";
import type { Movie, SortOption } from "../../types";
import { COLUMNS, type VisibleColumns } from "./tableColumns";

interface MovieTableProps {
  movies: Movie[]; // Already filtered, searched, sorted and paged
  visibleColumns: VisibleColumns;
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: SortOption) => void;
  selectedIds: Set<number>;
  onSelect: (movieId: number | undefined, selected: boolean) => void;
  // The header checkbox: select or clear every movie on this page
  onSelectAll: (movieIds: number[], selected: boolean) => void;
  onOpen: (movieId?: number) => void;
}

const headClass = "border-b border-border px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap";
const cellClass = "border-b border-border/60 px-4 py-2 align-middle";
// The title column is a fixed width; longer titles are cut short with "…"
const TITLE_WIDTH = "w-56 max-w-56 md:w-96 md:max-w-96";

// The movie list's table: a checkbox per row (and select-all for the page), a small poster and
// the title (opens the drawer), then the optional columns. Rating stars save straight away.
function MovieTable({
  movies,
  visibleColumns,
  sortBy,
  sortDirection,
  onSort,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpen,
}: MovieTableProps) {
  const rateMovie = useRateMovie();
  const sortProps = { sortBy, sortDirection, onSort };
  const pageIds = movies.flatMap((m) => (m.id === undefined ? [] : [m.id]));
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const anySelected = selectedIds.size > 0;

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl border border-border bg-card">
      {/* Two scroll areas so a swipe moves the table one way at a time: the outer one only
          scrolls sideways, the inner one only up and down. Touch browsers lock each gesture
          to the area matching its starting direction. The vertical one is inside so the
          sticky header still sticks, while moving sideways with the columns. */}
      <div className="h-full w-max min-w-full overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className={cn(headClass, "w-10 pr-0")}>
                <Checkbox
                  checked={
                    selectedOnPage > 0 && selectedOnPage === pageIds.length
                      ? true
                      : selectedOnPage > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => onSelectAll(pageIds, checked === true)}
                  aria-label="Select every movie on this page"
                  className="align-middle"
                />
              </th>
              <SortHeader label="Title" sortKey="alphabetic" {...sortProps} className={TITLE_WIDTH} />
              {COLUMNS.filter(({ key }) => visibleColumns[key]).map(({ key, label, sortKey }) => (
                <SortHeader
                  key={key}
                  label={label}
                  sortKey={sortKey}
                  {...sortProps}
                  className={key === "purchasePrice" ? "text-right" : undefined}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {movies.map((movie) => {
              const selected = selectedIds.has(movie.id ?? -1);
              return (
                <tr
                  key={movie.id}
                  className={cn(
                    "group transition-colors",
                    selected ? "bg-primary-soft" : "hover:bg-accent/50",
                  )}
                >
                  <td className={cn(cellClass, "w-10 pr-0")}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => onSelect(movie.id, checked === true)}
                      aria-label={`Select ${movie.title}`}
                      className={cn(
                        "align-middle transition-opacity",
                        !selected && !anySelected && "opacity-40 group-hover:opacity-100",
                      )}
                    />
                  </td>
                  <td className={cn(cellClass, TITLE_WIDTH)}>
                    <Link
                      to={`/library?movie=${movie.id}`}
                      onClick={(e) => {
                        // Plain clicks open the drawer; ctrl/cmd-click opens the list with it in a drawer, in a new tab
                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                        e.preventDefault();
                        onOpen(movie.id);
                      }}
                      className="flex min-w-0 items-center gap-3 hover:underline"
                      title={movie.title}
                    >
                      {movie.posterPath ? (
                        <img
                          src={movie.posterPath}
                          alt=""
                          loading="lazy"
                          className="h-10 w-7 shrink-0 rounded-sm border border-white/10 bg-muted object-cover"
                        />
                      ) : (
                        <span className="h-10 w-7 shrink-0 rounded-sm bg-muted" />
                      )}
                      <span className="truncate font-medium">{movie.title}</span>
                    </Link>
                  </td>
                  {visibleColumns.year && (
                    <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground tabular-nums")}>
                      {movie.year || "–"}
                    </td>
                  )}
                  {visibleColumns.format && (
                    <td className={cn(cellClass, "whitespace-nowrap")}>
                      {movie.formats.length > 0 ? (
                        <span className="flex gap-1">
                          {[...movie.formats].sort().map((fmt) => (
                            <Badge key={fmt} variant="outline" className="font-normal text-foreground/85">
                              {fmt}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.condition && (
                    <td className={cn(cellClass, "whitespace-nowrap text-foreground/85")}>{movie.condition}</td>
                  )}
                  {visibleColumns.rating && (
                    <td className={cn(cellClass, "whitespace-nowrap")}>
                      <QuickRating
                        rating={movie.rating}
                        onRate={(rating) => rateMovie.mutate({ movie, rating })}
                        label={`Rate ${movie.title}`}
                      />
                    </td>
                  )}
                  {visibleColumns.purchasePrice && (
                    <td className={cn(cellClass, "text-right font-mono text-[13px] whitespace-nowrap tabular-nums")}>
                      {/* The price, then a gift icon for gifts; a gift with no price shows just the icon */}
                      <span className="inline-flex items-center gap-1.5">
                        {movie.purchasePrice
                          ? `$${movie.purchasePrice.toFixed(2)}`
                          : !movie.isGift && <span className="text-muted-foreground">–</span>}
                        {movie.isGift && (
                          <Gift className="size-3.5 text-muted-foreground" aria-label="Gift" />
                        )}
                      </span>
                    </td>
                  )}
                  {visibleColumns.dateAdded && (
                    <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground")}>
                      {getRelativeTimeString(movie.createdAt)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MovieTable;
