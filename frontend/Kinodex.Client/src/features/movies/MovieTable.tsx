import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import SortHeader from "../../components/SortHeader";
import { QuickRating } from "../../components/StarRating";
import CopyRowToggle, { CopyRowLabel, COPY_TOGGLE_SPACE } from "../../components/CopyRowToggle";
import { useRateMovie } from "./api";
import { getRelativeTimeString } from "../../utils/dateUtils";
import { allConditions, allFormats, lastAdded, totalPaid } from "../../utils/copies";
import { isEmpty, rowChecked, type CopySelection, type TitleRow } from "../../utils/copySelection";
import type { Copy, Movie, SortOption } from "../../types";
import { COLUMNS, type VisibleColumns } from "./tableColumns";

interface MovieTableProps {
  // Already filtered, searched, sorted and paged; each with the copies the filters let through
  rows: TitleRow<Movie>[];
  visibleColumns: VisibleColumns;
  sortBy: SortOption;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: SortOption) => void;
  selection: CopySelection;
  // A title's checkbox (or the header's, for every row on the page) ticks its copies
  onSelectRows: (rows: TitleRow<Movie>[], selected: boolean) => void;
  onSelectCopy: (copyId: number, selected: boolean) => void;
  // Whether a title with several copies shows them as rows underneath
  isOpen: (movieId: number | undefined) => boolean;
  onOpenChange: (movieId: number | undefined, open: boolean) => void;
  onOpen: (movieId?: number) => void;
}

const headClass = "border-b border-border px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap";
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

// The price, then a gift icon for gifts; a gift with no price shows just the icon
function Paid({ amount, gift }: { amount: number; gift: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {amount ? `$${amount.toFixed(2)}` : !gift && <span className="text-muted-foreground">–</span>}
      {gift && <Gift className="size-3.5 text-muted-foreground" aria-label="Gift" />}
    </span>
  );
}

// The movie list's table: a checkbox per row (and select-all for the page), a small poster and
// the title (opens the drawer), then the optional columns. A movie with several copies can open to
// show a row for each, with its own checkbox; its own row adds them up. Rating stars save straight
// away.
function MovieTable({
  rows,
  visibleColumns,
  sortBy,
  sortDirection,
  onSort,
  selection,
  onSelectRows,
  onSelectCopy,
  isOpen,
  onOpenChange,
  onOpen,
}: MovieTableProps) {
  const rateMovie = useRateMovie();
  const sortProps = { sortBy, sortDirection, onSort };
  const anySelected = !isEmpty(selection);
  const pageStates = rows.map((row) => rowChecked(row, selection));
  const pageChecked = pageStates.length > 0 && pageStates.every((s) => s === true)
    ? true
    : pageStates.some((s) => s !== false)
      ? "indeterminate"
      : false;

  const checkboxClass = (checked: boolean | "indeterminate") =>
    cn("align-middle transition-opacity", !checked && !anySelected && "opacity-40 group-hover:opacity-100");

  // A copy's own row, under its movie: its format, condition, price and date added
  const copyRow = (movie: Movie, copy: Copy, index: number) => {
    const selected = copy.id !== undefined && selection.copyIds.has(copy.id);
    return (
      <tr
        key={`${movie.id}-${copy.id ?? index}`}
        className={cn("group transition-colors", selected ? "bg-primary-soft" : "bg-muted/25 hover:bg-accent/50")}
      >
        <td className={cn(cellClass, "w-10 pr-0")}>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => copy.id !== undefined && onSelectCopy(copy.id, checked === true)}
            aria-label={`Select copy ${index + 1} of ${movie.title}`}
            className={checkboxClass(selected)}
          />
        </td>
        <td className={cn(cellClass, TITLE_WIDTH, COPY_TOGGLE_SPACE)}>
          <CopyRowLabel copy={copy} index={index} />
        </td>
        {visibleColumns.year && <td className={cellClass} />}
        {visibleColumns.format && (
          <td className={cn(cellClass, "whitespace-nowrap")}>
            <Formats formats={allFormats([copy])} />
          </td>
        )}
        {visibleColumns.condition && (
          <td className={cn(cellClass, "whitespace-nowrap text-foreground/85")}>{copy.condition}</td>
        )}
        {visibleColumns.rating && <td className={cellClass} />}
        {visibleColumns.purchasePrice && (
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
  };

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
                  checked={pageChecked}
                  onCheckedChange={(checked) => onSelectRows(rows, checked === true)}
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
            {rows.map((row, rowIndex) => {
              const { title: movie, copies } = row;
              const checked = pageStates[rowIndex];
              const several = copies.length > 1;
              const open = several && isOpen(movie.id);
              return [
                <tr
                  key={movie.id}
                  className={cn("group transition-colors", checked === true ? "bg-primary-soft" : "hover:bg-accent/50")}
                >
                  <td className={cn(cellClass, "w-10 pr-0")}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const on = value === true;
                        onSelectRows([row], on);
                        // Ticking a movie with several copies opens it, to show which are ticked
                        if (on && several) onOpenChange(movie.id, true);
                      }}
                      aria-label={`Select ${movie.title}`}
                      className={checkboxClass(checked)}
                    />
                  </td>
                  <td className={cn(cellClass, TITLE_WIDTH)}>
                    <div className="flex min-w-0 items-center gap-3">
                      <CopyRowToggle
                        count={several ? copies.length : 0}
                        open={open}
                        title={movie.title}
                        onToggle={() => onOpenChange(movie.id, !open)}
                      />
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
                            className="h-10 w-7 shrink-0 rounded-sm border border-border bg-muted object-cover"
                          />
                        ) : (
                          <span className="h-10 w-7 shrink-0 rounded-sm bg-muted" />
                        )}
                        <span className="truncate font-medium">{movie.title}</span>
                      </Link>
                    </div>
                  </td>
                  {visibleColumns.year && (
                    <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground tabular-nums")}>
                      {movie.year || "–"}
                    </td>
                  )}
                  {visibleColumns.format && (
                    <td className={cn(cellClass, "whitespace-nowrap")}>
                      <Formats formats={allFormats(copies)} />
                    </td>
                  )}
                  {visibleColumns.condition && (
                    <td className={cn(cellClass, "whitespace-nowrap text-foreground/85")}>
                      {allConditions(copies).join(", ") || <span className="text-muted-foreground">–</span>}
                    </td>
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
                      <Paid amount={totalPaid(copies)} gift={copies.some((c) => c.isGift)} />
                    </td>
                  )}
                  {visibleColumns.dateAdded && (
                    <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground")}>
                      {getRelativeTimeString(lastAdded(movie))}
                    </td>
                  )}
                </tr>,
                ...(open ? copies.map((copy) => copyRow(movie, copy, movie.copies.indexOf(copy))) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MovieTable;
