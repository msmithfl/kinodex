import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QuickRating } from "./StarRating";
import { useRateMovie } from "../features/movies/api";
import type { Movie } from "../types";

interface SimpleMovieTableProps {
  movies: Movie[]; // Shown in the order given
  // A row was clicked: open the movie (e.g. in a drawer)
  onOpen: (movieId?: number) => void;
  // The Rating column; collections leave it out
  showRating?: boolean;
  // Never wider than its container: fixed column widths, the title truncates and formats wrap
  // (e.g. in a drawer). Otherwise columns size to their content and the table scrolls sideways.
  fitWidth?: boolean;
  // Extra classes for the card, e.g. to let it scroll on its own (the header row stays put)
  className?: string;
}

// A compact table of movies (title, year, format, rating) styled like the Movies and TV Shows
// tables, for collection and genre pages. Scrolls sideways on narrow screens unless fitWidth is set.
function SimpleMovieTable({
  movies,
  onOpen,
  showRating = true,
  fitWidth = false,
  className,
}: SimpleMovieTableProps) {
  // The Rating column's stars save straight away
  const rateMovie = useRateMovie();
  const headings = ["Title", "Year", "Format", ...(showRating ? ["Rating"] : [])];
  const cellClass = "border-b border-border/60 px-3 py-2 align-middle md:px-4";
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        fitWidth ? "overflow-hidden" : "overflow-x-auto overscroll-x-contain",
        className,
      )}
    >
      <table className={cn("w-full border-separate border-spacing-0 text-sm", fitWidth && "table-fixed")}>
        {fitWidth && (
          // The title takes whatever width the fixed columns leave
          <colgroup>
            <col />
            <col className="w-18" />
            <col className="w-32 md:w-44" />
            {showRating && <col className="w-32" />}
          </colgroup>
        )}
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                className="border-b border-border px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted-foreground md:px-4"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movies.map((movie) => (
            <tr
              key={movie.id}
              onClick={() => onOpen(movie.id)}
              className="cursor-pointer transition-colors hover:bg-accent/50 [&:last-child>td]:border-b-0"
            >
              <td className={cn(cellClass, !fitWidth && "max-w-56 md:max-w-80")}>
                <Link
                  to={`/library?movie=${movie.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
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
              </td>
              <td className={cn(cellClass, "whitespace-nowrap text-muted-foreground tabular-nums")}>
                {movie.year || "–"}
              </td>
              <td className={cn(cellClass, !fitWidth && "whitespace-nowrap")}>
                {movie.formats.length > 0 ? (
                  <span className={cn("flex gap-1", fitWidth && "flex-wrap")}>
                    {movie.formats.map((fmt) => (
                      <Badge key={fmt} variant="outline" className="font-normal text-foreground/85">
                        {fmt}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </td>
              {showRating && (
                <td className={cn(cellClass, "whitespace-nowrap")}>
                  {/* Click to rate; clicks don't open the row's drawer */}
                  <QuickRating
                    rating={movie.rating}
                    onRate={(rating) => rateMovie.mutate({ movie, rating })}
                    label={`Rate ${movie.title}`}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SimpleMovieTable;
