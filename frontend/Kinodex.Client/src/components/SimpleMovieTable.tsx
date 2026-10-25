import { Link } from "react-router-dom";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import type { Movie } from "../types";

interface SimpleMovieTableProps {
  movies: Movie[]; // Shown in the order given
  // A row was clicked: open the movie (e.g. in a drawer)
  onOpen: (movieId?: number) => void;
}

// A compact table of movies (title, year, format, rating) styled like the Movies and TV Shows
// tables, for collection and genre pages. Scrolls sideways on narrow screens.
function SimpleMovieTable({ movies, onOpen }: SimpleMovieTableProps) {
  return (
    <div className="overflow-x-auto overscroll-x-contain rounded border border-white/10">
      <table className="w-full border-separate border-spacing-0">
        <thead className="bg-gray-700">
          <tr>
            {["Title", "Year", "Format", "Rating"].map((heading, i, all) => (
              <th
                key={heading}
                className={`px-4 md:px-6 py-2 text-left text-sm font-semibold text-gray-200 whitespace-nowrap ${
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
              <td className="px-4 md:px-6 py-2 text-white max-w-56 md:max-w-80 align-middle">
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
              <td className="px-4 md:px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                {movie.year || "-"}
              </td>
              <td className="px-4 md:px-6 py-2 whitespace-nowrap align-middle">
                {movie.formats.length > 0 ? (
                  movie.formats.join(", ")
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </td>
              <td className="px-4 md:px-6 py-2 whitespace-nowrap align-middle">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) =>
                    movie.rating >= star ? (
                      <TiStarFullOutline key={star} className="w-5 h-5 text-yellow-400" />
                    ) : movie.rating === star - 0.5 ? (
                      <TiStarHalfOutline key={star} className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <TiStarOutline key={star} className="w-5 h-5 text-gray-500" />
                    ),
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SimpleMovieTable;
