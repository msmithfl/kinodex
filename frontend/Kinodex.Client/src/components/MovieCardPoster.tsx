import { Link } from "react-router-dom";

interface Movie {
  id?: number;
  title: string;
  year?: number;
  posterPath: string;
  formats?: string[];
  shelfNumber?: number;
}

interface MoviePosterCardProps {
  movie: Movie;
  showShelf?: boolean;
  // Show the title and details under the poster at all times instead of on hover
  captionBelow?: boolean;
}

function MoviePosterCard({
  movie,
  showShelf = false,
  captionBelow = false,
}: MoviePosterCardProps) {
  if (captionBelow) {
    const details = [
      movie.year || null,
      movie.formats && movie.formats.length > 0
        ? [...movie.formats].sort().join(", ")
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <Link to={`/movie/${movie.id}`} className="group flex flex-col min-w-0">
        {/* Hover: the outline turns indigo and a dark overlay fades in; no zoom */}
        <div className="relative aspect-2/3 rounded border border-white/20 overflow-hidden shadow-lg transition-colors duration-200 group-hover:border-indigo-500">
          {movie.posterPath ? (
            <img
              src={movie.posterPath}
              alt={`${movie.title} poster`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://via.placeholder.com/300x450?text=No+Poster";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-xs text-center px-2">
                No poster
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 pointer-events-none" />
        </div>
        <h3
          className="mt-2 text-white text-xs md:text-sm font-semibold leading-tight truncate group-hover:underline"
          title={movie.title}
        >
          {movie.title}
        </h3>
        {(showShelf || details) && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {showShelf ? `Shelf #${movie.shelfNumber || "N/A"}` : details}
          </p>
        )}
      </Link>
    );
  }

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group relative aspect-2/3 max-w-42 rounded border-[0.5px] border-white/20 overflow-hidden shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-2xl"
    >
      {movie.posterPath ? (
        <img
          src={movie.posterPath}
          alt={`${movie.title} poster`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/300x450?text=No+Poster";
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <span className="text-gray-400 text-sm text-center px-2">
            {movie.title}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">
            {movie.title}
          </h3>
          {showShelf ? (
            <p className="text-gray-300 text-xs">
              Shelf #{movie.shelfNumber || "N/A"}
            </p>
          ) : (
            <>
              {movie.year && (
                <p className="text-gray-300 text-xs">{movie.year}</p>
              )}
              {movie.formats && movie.formats.length > 0 && (
                <p className="text-gray-400 text-xs">
                  {movie.formats.join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default MoviePosterCard;
