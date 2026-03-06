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
}

function MoviePosterCard({ movie, showShelf = false }: MoviePosterCardProps) {
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group relative aspect-2/3 max-w-42 rounded-lg overflow-hidden shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-2xl"
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
