import { Link } from "react-router-dom";

interface Movie {
  id?: number;
  title: string;
  year?: number;
  upcNumber?: string;
  formats: string[];
  condition: string;
  rating: number;
  posterPath: string;
  shelfNumber?: number;
}

interface MovieDetailCardProps {
  movie: Movie;
  showYear?: boolean;
  showUpc?: boolean;
  showShelfNumber?: boolean;
}

function MovieDetailCard({
  movie,
  showYear = false,
  showUpc = false,
  showShelfNumber = false,
}: MovieDetailCardProps) {
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg overflow-hidden transition-all duration-200 transform hover:scale-105 flex gap-4 p-4"
    >
      {movie.posterPath && (
        <img
          src={movie.posterPath}
          alt={`${movie.title} poster`}
          className="w-24 h-36 object-cover rounded-md shrink-0"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/96x144?text=No+Poster";
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white mb-2 truncate">
            {movie.title}
          </h3>
          {showYear && movie.year && (
            <p className="text-gray-400 text-sm font-mono">{movie.year}</p>
          )}
          {showUpc && movie.upcNumber && (
            <p className="text-gray-400 text-sm font-mono">{movie.upcNumber}</p>
          )}
        </div>

        {movie.formats && movie.formats.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {[...movie.formats].sort().map((fmt, idx) => (
              <span
                key={idx}
                className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium"
              >
                {fmt}
              </span>
            ))}
          </div>
        )}

        {showShelfNumber && movie.shelfNumber && movie.shelfNumber > 0 && (
          <div className="text-sm text-gray-300 mb-2">
            Shelf #{movie.shelfNumber}
          </div>
        )}

        {movie.condition && (
          <div className="mt-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                movie.condition === "New"
                  ? "bg-green-600 text-white"
                  : movie.condition === "Good"
                    ? "bg-blue-600 text-white"
                    : movie.condition === "Skips"
                      ? "bg-yellow-600 text-white"
                      : "bg-red-600 text-white"
              }`}
            >
              {movie.condition}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default MovieDetailCard;
