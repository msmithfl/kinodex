import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import SortHeader from "../../components/SortHeader";
import { QuickRating } from "../../components/StarRating";
import { useRateTvShow } from "./api";
import { getRelativeTimeString } from "../../utils/dateUtils";
import { formatSeasons } from "../../utils/formatSeasons";
import type { SortOption, TvShow } from "../../types";
import { COLUMNS, type VisibleColumns } from "./tableColumns";

// A show with the figures its purchases add up to, so the shared sorter can sort by them
export type TvShowRow = TvShow & {
  formats: string[];
  purchasePrice: number;
  condition: string;
  owned: number[];
  hasGift: boolean;
};

interface TvShowTableProps {
  shows: TvShowRow[]; // Already filtered, searched and sorted
  visibleColumns: VisibleColumns;
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: SortOption) => void;
  onOpen: (showId?: number) => void;
}

const headClass = "border-b border-border px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground";
const cellClass = "border-b border-border/60 px-4 py-2 align-middle";
// The title column is a fixed width; longer titles are cut short with "…"
const TITLE_WIDTH = "w-56 max-w-56 md:w-96 md:max-w-96";

// The TV list's table: a small poster and the title (opens the drawer), then the optional
// columns. A whole row opens the drawer; rating stars save straight away.
function TvShowTable({ shows, visibleColumns, sortBy, sortDirection, onSort, onOpen }: TvShowTableProps) {
  const rateTvShow = useRateTvShow();
  const sortProps = { sortBy, sortDirection, onSort };

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
              <SortHeader label="Title" sortKey="alphabetic" {...sortProps} className={TITLE_WIDTH} />
              {COLUMNS.filter(({ key }) => visibleColumns[key]).map(({ key, label, sortKey }) =>
                sortKey ? (
                  <SortHeader
                    key={key}
                    label={label}
                    sortKey={sortKey}
                    {...sortProps}
                    className={key === "totalPaid" ? "text-right" : undefined}
                  />
                ) : (
                  <th key={key} className={headClass}>
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {shows.map((show) => (
              <tr
                key={show.id}
                onClick={() => onOpen(show.id)}
                className="cursor-pointer transition-colors hover:bg-accent/50"
              >
                <td className={cn(cellClass, TITLE_WIDTH)}>
                  <Link
                    to={`/tv-shows?show=${show.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Plain clicks open the drawer; ctrl/cmd-click opens the list with it in a drawer, in a new tab
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      onOpen(show.id);
                    }}
                    className="flex min-w-0 items-center gap-3 hover:underline"
                    title={show.title}
                  >
                    {show.posterPath ? (
                      <img
                        src={show.posterPath}
                        alt=""
                        loading="lazy"
                        className="h-10 w-7 shrink-0 rounded-sm border border-border bg-muted object-cover"
                      />
                    ) : (
                      <span className="h-10 w-7 shrink-0 rounded-sm bg-muted" />
                    )}
                    <span className="truncate font-medium">{show.title}</span>
                  </Link>
                </td>
                {visibleColumns.seasons && (
                  <td className={cn(cellClass, "whitespace-nowrap text-foreground/85")}>
                    {formatSeasons(show.owned, show.totalSeasons)}
                  </td>
                )}
                {visibleColumns.year && (
                  <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground tabular-nums")}>
                    {show.year || "–"}
                  </td>
                )}
                {visibleColumns.format && (
                  <td className={cn(cellClass, "whitespace-nowrap")}>
                    {show.formats.length > 0 ? (
                      <span className="flex gap-1">
                        {show.formats.map((fmt) => (
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
                {visibleColumns.rating && (
                  <td className={cn(cellClass, "whitespace-nowrap")}>
                    {/* Click to rate; clicks don't open the row's drawer */}
                    <QuickRating
                      rating={show.rating}
                      onRate={(rating) => {
                        if (show.id !== undefined) rateTvShow.mutate({ id: show.id, rating });
                      }}
                      label={`Rate ${show.title}`}
                    />
                  </td>
                )}
                {visibleColumns.totalPaid && (
                  <td className={cn(cellClass, "text-right font-mono text-[13px] whitespace-nowrap tabular-nums")}>
                    {/* The total, then a gift icon when any purchase was a gift; all gifts with no
                        price shows just the icon */}
                    <span className="inline-flex items-center gap-1.5">
                      {show.purchasePrice > 0
                        ? `$${show.purchasePrice.toFixed(2)}`
                        : !show.hasGift && <span className="text-muted-foreground">–</span>}
                      {show.hasGift && <Gift className="size-3.5 text-muted-foreground" aria-label="Includes a gift" />}
                    </span>
                  </td>
                )}
                {visibleColumns.dateAdded && (
                  <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground")}>
                    {getRelativeTimeString(show.createdAt)}
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

export default TvShowTable;
