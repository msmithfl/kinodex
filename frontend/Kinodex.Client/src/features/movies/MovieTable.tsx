import { Link } from "react-router-dom";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import SortHeader from "../../components/SortHeader";
import { QuickRating } from "../../components/StarRating";
import CopyRowToggle, { CopyRowLabel } from "../../components/CopyRowToggle";
import { useRateMovie } from "./api";
import { getRelativeTimeString } from "../../utils/dateUtils";
import { allConditions, allFormats, lastAdded, totalPaid } from "../../utils/copies";
import { isEmpty, rowChecked, type CopySelection, type TitleRow } from "../../utils/copySelection";
import type { Copy, Movie, SortOption } from "../../types";
import { COLUMNS, type VisibleColumns } from "./tableColumns";
import { canHover } from "../../utils/isMobile";
import { useLongPress } from "../../utils/useLongPress";

interface MovieTableProps {
  // Already filtered, searched, sorted and paged; each with the copies the filters let through
  rows: TitleRow<Movie>[];
  visibleColumns: VisibleColumns;
  // A small poster before each title (the Display menu's Poster thumbnails)
  showPosters: boolean;
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

// A title's (or a copy's) checkbox, over its poster's place at the start of the title cell, so
// no row keeps a column for it. It shows while anything is ticked, when this one is, and (with a
// mouse) on hovering the poster, which is then the checkbox's bigger target. On touch screens a
// tap on the poster opens the drawer until something is ticked (a long press on a row starts).
function PosterCheckbox({
  checked,
  selecting,
  label,
  onChange,
  children,
}: {
  checked: boolean | "indeterminate";
  selecting: boolean;
  label: string;
  onChange: (on: boolean) => void;
  children?: React.ReactNode; // The poster; none on a copy's row
}) {
  const showing = selecting || checked !== false;
  return (
    <div
      className="group/check relative h-10 w-7 shrink-0"
      onClick={(e) => {
        if (!selecting && !canHover()) return; // A tap opens the drawer, as the row does
        e.stopPropagation();
        onChange(checked !== true);
      }}
    >
      {children}
      <div
        className={cn(
          "absolute inset-0 grid place-items-center rounded-sm transition-opacity",
          children && "bg-black/50",
          showing
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover/check:pointer-events-auto group-hover/check:opacity-100 has-focus-visible:opacity-100",
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
          className="bg-card"
        />
      </div>
    </div>
  );
}

// The movie list's table: a small poster and the title (with a chip to open a movie's copies when
// it has several), then the optional columns. A whole row opens the drawer, as in the TV table.
// Rows are ticked with a checkbox over the poster (or, with Poster thumbnails off, in a column of
// their own); on touch screens a long press on a row ticks it. While anything is ticked, a click
// or tap on a row ticks it instead of opening it. A movie with several copies can open to show a
// row for each, with its own checkbox; its own row adds them up. Rating stars save straight away.
function MovieTable({
  rows,
  visibleColumns,
  showPosters,
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
  const selecting = !isEmpty(selection);
  const pageStates = rows.map((row) => rowChecked(row, selection));
  const pageChecked = pageStates.length > 0 && pageStates.every((s) => s === true)
    ? true
    : pageStates.some((s) => s !== false)
      ? "indeterminate"
      : false;

  // Ticks or unticks a movie; ticking one with several copies opens it, to show which are ticked
  const selectRow = (row: TitleRow<Movie>, on: boolean) => {
    onSelectRows([row], on);
    if (on && row.copies.length > 1) onOpenChange(row.title.id, true);
  };
  // A long press (touch screens) ticks a movie's row, or a copy's
  const longPress = useLongPress<{ row: TitleRow<Movie>; copy?: Copy }>(({ row, copy }) => {
    if (copy?.id !== undefined) onSelectCopy(copy.id, true);
    else selectRow(row, true);
  });
  // Rows can be long-pressed without the phone selecting their text or offering its link menu
  const rowClass = "group cursor-pointer transition-colors pointer-coarse:select-none [-webkit-touch-callout:none]";

  // With Poster thumbnails off, the checkboxes have a column of their own (faint until hovered)
  const checkboxColumn = !showPosters;
  const checkboxClass = (checked: boolean | "indeterminate") =>
    cn("align-middle transition-opacity", !checked && !selecting && "opacity-40 group-hover:opacity-100");

  // A copy's own row, under its movie: its format, condition, price and date added
  const copyRow = (row: TitleRow<Movie>, copy: Copy, index: number) => {
    const movie = row.title;
    const selected = copy.id !== undefined && selection.copyIds.has(copy.id);
    const select = (on: boolean) => {
      if (copy.id !== undefined) onSelectCopy(copy.id, on);
    };
    const label = `Select copy ${index + 1} of ${movie.title}`;
    return (
      <tr
        key={`${movie.id}-${copy.id ?? index}`}
        {...longPress({ row, copy })}
        onClick={() => (selecting ? select(!selected) : onOpen(movie.id))}
        className={cn(rowClass, selected ? "bg-primary-soft" : "bg-muted/25 hover:bg-accent/50")}
      >
        {checkboxColumn && (
          // The checkbox (and the space around it) ticks rather than opening the drawer
          <td className={cn(cellClass, "w-10 cursor-default pr-0")} onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => select(checked === true)}
              aria-label={label}
              className={checkboxClass(selected)}
            />
          </td>
        )}
        <td className={cn(cellClass, TITLE_WIDTH, checkboxColumn && "pl-8")}>
          {checkboxColumn ? (
            <CopyRowLabel copy={copy} index={index} />
          ) : (
            // Its checkbox under the movie's poster (over its product image, when it has one), and
            // its name under the movie's title
            <div className="flex min-w-0 items-center gap-3">
              <PosterCheckbox checked={selected} selecting={selecting} label={label} onChange={select}>
                {copy.productPosterPath && (
                  <img
                    src={copy.productPosterPath}
                    alt=""
                    loading="lazy"
                    className="h-10 w-7 shrink-0 rounded-sm border border-border bg-muted object-cover"
                  />
                )}
              </PosterCheckbox>
              <CopyRowLabel copy={copy} index={index} />
            </div>
          )}
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

  const selectAll = (
    <Checkbox
      checked={pageChecked}
      onCheckedChange={(checked) => onSelectRows(rows, checked === true)}
      aria-label="Select every movie on this page"
      className="align-middle"
    />
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
              {checkboxColumn && <th className={cn(headClass, "w-10 pr-0")}>{selectAll}</th>}
              <SortHeader
                label="Title"
                sortKey="alphabetic"
                {...sortProps}
                className={TITLE_WIDTH}
                // Select-all over the posters, the label over the titles
                before={
                  !checkboxColumn && (
                    <span className="grid w-7 shrink-0 place-items-center">
                      {selectAll}
                    </span>
                  )
                }
              />
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
              const label = `Select ${movie.title}`;
              return [
                <tr
                  key={movie.id}
                  {...longPress({ row })}
                  onClick={() => (selecting ? selectRow(row, checked !== true) : onOpen(movie.id))}
                  className={cn(rowClass, checked === true ? "bg-primary-soft" : "hover:bg-accent/50")}
                >
                  {checkboxColumn && (
                    // The checkbox (and the space around it) ticks rather than opening the drawer
                    <td className={cn(cellClass, "w-10 cursor-default pr-0")} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => selectRow(row, value === true)}
                        aria-label={label}
                        className={checkboxClass(checked)}
                      />
                    </td>
                  )}
                  <td className={cn(cellClass, TITLE_WIDTH)}>
                    <div className="flex min-w-0 items-center gap-3">
                      {showPosters && (
                        <PosterCheckbox checked={checked} selecting={selecting} label={label} onChange={(on) => selectRow(row, on)}>
                          {movie.posterPath ? (
                            <img
                              src={movie.posterPath}
                              alt=""
                              loading="lazy"
                              className="h-10 w-7 rounded-sm border border-border bg-muted object-cover"
                            />
                          ) : (
                            <span className="block h-10 w-7 rounded-sm bg-muted" />
                          )}
                        </PosterCheckbox>
                      )}
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          to={`/library?movie=${movie.id}`}
                          onClick={(e) => {
                            e.stopPropagation(); // The row would act on the click a second time
                            // Plain clicks open the drawer (or tick, while selecting); ctrl/cmd-click
                            // opens the list with it in a drawer, in a new tab
                            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                            e.preventDefault();
                            if (selecting) selectRow(row, checked !== true);
                            else onOpen(movie.id);
                          }}
                          className="truncate font-medium hover:underline"
                          title={movie.title}
                        >
                          {movie.title}
                        </Link>
                        <CopyRowToggle
                          count={several ? copies.length : 0}
                          open={open}
                          title={movie.title}
                          onToggle={() => onOpenChange(movie.id, !open)}
                        />
                      </div>
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
                ...(open ? copies.map((copy) => copyRow(row, copy, movie.copies.indexOf(copy))) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MovieTable;
