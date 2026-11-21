import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import SortHeader from "../../components/SortHeader";
import { QuickRating } from "../../components/StarRating";
import CopyRowToggle, { CopyRowLabel, COPY_TOGGLE_SPACE } from "../../components/CopyRowToggle";
import { useRateTvShow } from "./api";
import { getRelativeTimeString } from "../../utils/dateUtils";
import { formatSeasons } from "../../utils/formatSeasons";
import { allFormats, lastAdded, ownedSeasons, seasonsTitle, totalPaid } from "../../utils/copies";
import type { TitleRow } from "../../utils/copySelection";
import type { Copy, SortOption, TvShow } from "../../types";
import { COLUMNS, type VisibleColumns } from "./tableColumns";

interface TvShowTableProps {
  // Already filtered, searched and sorted; each with the copies the filters let through
  rows: TitleRow<TvShow>[];
  visibleColumns: VisibleColumns;
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: SortOption) => void;
  // Whether a show with several copies shows them as rows underneath
  isOpen: (showId: number | undefined) => boolean;
  onOpenChange: (showId: number | undefined, open: boolean) => void;
  onOpen: (showId?: number) => void;
}

const headClass = "border-b border-border px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground";
const cellClass = "border-b border-border/60 px-4 py-2 align-middle";
// The title column is a fixed width; longer titles are cut short with "…"
const TITLE_WIDTH = "w-56 max-w-56 md:w-96 md:max-w-96";

function Formats({ formats }: { formats: string[] }) {
  return formats.length > 0 ? (
    <span className="flex gap-1">
      {formats.map((fmt) => (
        <Badge key={fmt} variant="outline" className="font-normal text-foreground/85">
          {fmt}
        </Badge>
      ))}
    </span>
  ) : (
    <span className="text-muted-foreground">–</span>
  );
}

// The amount, then a gift icon when there's a gift; a gift with no price shows just the icon
function Paid({ amount, gift }: { amount: number; gift: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {amount > 0 ? `$${amount.toFixed(2)}` : !gift && <span className="text-muted-foreground">–</span>}
      {gift && <Gift className="size-3.5 text-muted-foreground" aria-label="Includes a gift" />}
    </span>
  );
}

// The TV list's table: a small poster and the title (opens the drawer), then the optional
// columns. A show with several copies can open to show a row for each; its own row adds them up.
// A whole row opens the drawer; rating stars save straight away.
function TvShowTable({ rows, visibleColumns, sortBy, sortDirection, onSort, isOpen, onOpenChange, onOpen }: TvShowTableProps) {
  const rateTvShow = useRateTvShow();
  const sortProps = { sortBy, sortDirection, onSort };

  // A copy's own row, under its show: its seasons, format, price and date added
  const copyRow = (show: TvShow, copy: Copy, index: number) => (
    <tr
      key={`${show.id}-${copy.id ?? index}`}
      onClick={() => onOpen(show.id)}
      className="cursor-pointer bg-muted/25 transition-colors hover:bg-accent/50"
    >
      <td className={cn(cellClass, TITLE_WIDTH, COPY_TOGGLE_SPACE)}>
        <CopyRowLabel copy={copy} index={index} name={seasonsTitle(copy, show.totalSeasons)} />
      </td>
      {visibleColumns.seasons && (
        <td className={cn(cellClass, "whitespace-nowrap text-foreground/85")}>
          {formatSeasons(copy.seasons, show.totalSeasons)}
        </td>
      )}
      {visibleColumns.year && <td className={cellClass} />}
      {visibleColumns.format && (
        <td className={cn(cellClass, "whitespace-nowrap")}>
          <Formats formats={allFormats([copy])} />
        </td>
      )}
      {visibleColumns.rating && <td className={cellClass} />}
      {visibleColumns.totalPaid && (
        <td className={cn(cellClass, "text-right font-mono text-[13px] whitespace-nowrap tabular-nums")}>
          <Paid amount={copy.price} gift={copy.isGift} />
        </td>
      )}
      {visibleColumns.dateAdded && (
        <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground")}>
          {copy.createdAt ? getRelativeTimeString(copy.createdAt) : ""}
        </td>
      )}
    </tr>
  );

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
            {rows.map(({ title: show, copies }) => {
              const several = copies.length > 1;
              const open = several && isOpen(show.id);
              return [
                <tr
                  key={show.id}
                  onClick={() => onOpen(show.id)}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                >
                  <td className={cn(cellClass, TITLE_WIDTH)}>
                    <div className="flex min-w-0 items-center gap-3">
                      <CopyRowToggle
                        count={several ? copies.length : 0}
                        open={open}
                        title={show.title}
                        onToggle={() => onOpenChange(show.id, !open)}
                      />
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
                    </div>
                  </td>
                  {visibleColumns.seasons && (
                    <td className={cn(cellClass, "whitespace-nowrap text-foreground/85")}>
                      {formatSeasons(ownedSeasons(copies), show.totalSeasons)}
                    </td>
                  )}
                  {visibleColumns.year && (
                    <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground tabular-nums")}>
                      {show.year || "–"}
                    </td>
                  )}
                  {visibleColumns.format && (
                    <td className={cn(cellClass, "whitespace-nowrap")}>
                      <Formats formats={allFormats(copies)} />
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
                      <Paid amount={totalPaid(copies)} gift={copies.some((c) => c.isGift)} />
                    </td>
                  )}
                  {visibleColumns.dateAdded && (
                    <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground")}>
                      {getRelativeTimeString(lastAdded(show))}
                    </td>
                  )}
                </tr>,
                ...(open ? copies.map((copy) => copyRow(show, copy, show.copies.indexOf(copy))) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TvShowTable;
