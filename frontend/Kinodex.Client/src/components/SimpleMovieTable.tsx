import { Link } from "react-router-dom";
import { Stars } from "./StarRating";
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
}

// A compact table of movies (title, year, format, rating) styled like the Movies and TV Shows
// tables, for collection and genre pages. Scrolls sideways on narrow screens unless fitWidth is set.
function SimpleMovieTable({
  movies,
  onOpen,
  showRating = true,
  fitWidth = false,
}: SimpleMovieTableProps) {
  const headings = ["Title", "Year", "Format", ...(showRating ? ["Rating"] : [])];
  // Narrower padding when fitting, to leave the title as much room as possible
  const pad = fitWidth ? "px-3 md:px-4" : "px-4 md:px-6";
  return (
    <div
      className={`rounded border border-white/10 ${fitWidth ? "overflow-hidden" : "overflow-x-auto overscroll-x-contain"}`}
    >
      <table className={`w-full border-separate border-spacing-0 ${fitWidth ? "table-fixed" : ""}`}>
        {fitWidth && (
          // The title takes whatever width the fixed columns leave
          <colgroup>
            <col />
            <col className="w-18" />
            <col className="w-28 md:w-36" />
            {showRating && <col className="w-32" />}
          </colgroup>
        )}
        <thead className="bg-gray-700">
          <tr>
            {headings.map((heading, i, all) => (
              <th
                key={heading}
                className={`${pad} py-2 text-left text-sm font-semibold text-gray-200 whitespace-nowrap ${
                  i < all.length - 1 ? "border-r border-gray-600" : ""
                }`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {movies.map((movie, index) => (
            <tr
              key={movie.id}
              onClick={() => onOpen(movie.id)}
              className={`text-sm cursor-pointer ${index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"} hover:bg-gray-700 transition-colors duration-150`}
            >
              <td
                className={`${pad} py-2 text-white align-middle ${fitWidth ? "" : "max-w-56 md:max-w-80"}`}
              >
                <Link
                  to={`/movie/${movie.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Plain clicks open the drawer; ctrl/cmd-click still opens the full page in a new tab
                    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    onOpen(movie.id);
                  }}
                  className="inline-block truncate max-w-full align-middle hover:underline"
                  title={movie.title}
                >
                  {movie.title}
                </Link>
              </td>
              <td className={`${pad} py-2 text-gray-300 whitespace-nowrap align-middle`}>
                {movie.year || "-"}
              </td>
              <td
                className={`${pad} py-2 align-middle ${fitWidth ? "wrap-break-word" : "whitespace-nowrap"}`}
              >
                {movie.formats.length > 0 ? (
                  movie.formats.join(", ")
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              {showRating && (
                <td className={`${pad} py-2 whitespace-nowrap align-middle`}>
                  <div className="flex gap-0.5">
                    <Stars rating={movie.rating} />
                  </div>
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
