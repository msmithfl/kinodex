import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import { FaEdit, FaTrash } from "react-icons/fa";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Movie } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import { EditMovieModal } from "../components/EditMovieModal";

function MovieDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchMovie();
  }, [id]);

  const fetchMovie = async () => {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMovie(data);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Error fetching movie:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error deleting movie:", error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-400">Movie not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] pt-2">
      <div className="max-w-6xl mx-auto px-4 pt-2">
        <div className="overflow-hidden">
          {/* Movie Details Header */}
          <div className="p-8 border-b border-gray-700">
            <div className="grid grid-cols-12 gap-4 lg:gap-6">
              {/* Poster - Left */}
              <div className="col-span-4 lg:col-span-3">
                {movie.posterPath ? (
                  <img
                    src={movie.posterPath}
                    alt={`${movie.title} poster`}
                    className="rounded-lg shadow-lg w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/300x450?text=No+Poster";
                    }}
                  />
                ) : (
                  <div className="bg-gray-700 rounded-lg flex items-center justify-center h-full min-h-75">
                    <p className="text-gray-500 text-xs lg:text-base">
                      No poster
                    </p>
                  </div>
                )}
              </div>

              {/* Title, Year, Rating, Genres - Center */}
              <div className="col-span-8 lg:col-span-6 flex flex-col justify-center space-y-2 lg:space-y-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl lg:text-4xl font-bold text-white">
                    {movie.title}
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  <p className="text-lg lg:text-xl text-white">
                    {movie.year || (
                      <span className="text-gray-500">Not set</span>
                    )}
                  </p>
                  <a
                    href={
                      movie.tmdbId
                        ? `https://www.themoviedb.org/movie/${movie.tmdbId}`
                        : "https://www.themoviedb.org/"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                    title={movie.tmdbId ? "View on TMDB" : "Search on TMDB"}
                  >
                    <img
                      src="/tmdb-icon.png"
                      alt="TMDB"
                      className="w-8 h-8 lg:w-10 lg:h-10 hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>

                <div>
                  <div className="flex gap-1 items-center">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFullStar = movie.rating >= star;
                      const isHalfStar = movie.rating === star - 0.5;

                      return (
                        <div key={star}>
                          {isFullStar ? (
                            <TiStarFullOutline className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400" />
                          ) : isHalfStar ? (
                            <TiStarHalfOutline className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400" />
                          ) : (
                            <TiStarOutline className="w-6 h-6 lg:w-8 lg:h-8 text-gray-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  {movie.genres && movie.genres.length > 0 ? (
                    <div className="flex flex-wrap gap-1 lg:gap-2">
                      {movie.genres.map((genre, idx) => (
                        <Link
                          key={idx}
                          to={`/genres/${encodeURIComponent(genre)}`}
                          className="cursor-pointer hover:underline"
                        >
                          {genre}
                          {idx < movie.genres.length - 1 ? "," : ""}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm lg:text-base">
                      No genres
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
                    aria-label="Edit movie"
                  >
                    <FaEdit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
                    aria-label="Delete movie"
                  >
                    <FaTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Product Image & eBay Button - Right */}
              <div className="col-span-12 lg:col-span-3 flex lg:flex-col items-end justify-end gap-4">
                {movie.productPosterPath && (
                  <img
                    src={movie.productPosterPath}
                    alt={`${movie.title} product`}
                    className="rounded-lg shadow-md w-24 lg:w-32 h-auto object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}

                <button
                  onClick={() => {
                    const query = encodeURIComponent(`${movie.upcNumber}`);
                    window.open(
                      `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&rt=nc&LH_ItemCondition=4`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-xs lg:text-sm cursor-pointer w-auto lg:w-full"
                >
                  🔍 Search on eBay
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Physical Details Section */}
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Formats
                  </h3>
                  {movie.formats && movie.formats.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {[...movie.formats].sort().map((fmt, idx) => (
                        <span
                          key={idx}
                          className="cursor-pointer hover:underline"
                        >
                          {fmt}
                          {idx < movie.formats.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">None</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Condition
                  </h3>
                  <span>{movie.condition}</span>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    UPC Number
                  </h3>
                  <div className="relative inline-block">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(movie.upcNumber);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      title="Copy to clipboard"
                      className="text-base font-mono text-white bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md cursor-pointer transition-colors"
                    >
                      {movie.upcNumber}
                    </button>
                    {copied && (
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-green-400 text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Purchase Price
                  </h3>
                  <p className="text-base text-white">
                    {movie.purchasePrice > 0 ? (
                      `$${movie.purchasePrice.toFixed(2)}`
                    ) : (
                      <span className="text-gray-500">Not set</span>
                    )}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Watched
                  </h3>
                  <p className="text-base text-white flex items-center gap-2">
                    {movie.hasWatched ? (
                      <>
                        <LuEye className="w-5 h-5" /> Yes
                      </>
                    ) : (
                      <>
                        <LuEyeClosed className="w-5 h-5" /> No
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Details Section */}
            <div className="mb-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Collections
                  </h3>
                  {movie.collections && movie.collections.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {movie.collections.map((col, idx) => (
                        <Link
                          key={idx}
                          to={`/collections/${encodeURIComponent(col)}`}
                          className="cursor-pointer hover:underline"
                        >
                          {col}
                          {idx < movie.collections.length - 1 ? "," : ""}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">None</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Shelf Number
                    </h3>
                    <p className="text-base text-white">
                      {movie.shelfNumber > 0 ? (
                        `${movie.shelfNumber}`
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-4">
                      Shelf Section
                    </h3>
                    <Link
                      to={`/shelfsections/${encodeURIComponent(movie.shelfSection || "Unshelved")}`}
                      className="cursor-pointer hover:underline"
                    >
                      {movie.shelfSection || "Unshelved"}
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      HDD Number
                    </h3>
                    <p className="text-base text-white">
                      {movie.hdDriveNumber > 0 ? (
                        `Drive #${movie.hdDriveNumber}`
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      On Plex
                    </h3>
                    <p className="text-base text-white flex items-center gap-2">
                      {movie.isOnPlex ? (
                        <>
                          <HiSignal className="w-5 h-5" /> Yes
                        </>
                      ) : (
                        <>
                          <HiOutlineSignalSlash className="w-5 h-5" /> No
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="mb-8">
              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Date Added</h3>
                  <p className="text-base text-white">{formatDate(movie.createdAt)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Movie ID</h3>
                  <p className="text-base text-white font-mono">#{movie.id}</p>
                </div>
              </div> */}

              <div className="p-6 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Review / Notes
                </h3>
                {movie.review ? (
                  <p className="text-white whitespace-pre-wrap">
                    {movie.review}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    No review or notes added
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {showModal && <EditMovieModal onClose={() => setShowModal(false)} />}

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Movie"
          message="Are you sure you want to delete this movie? This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </div>
    </div>
  );
}

export default MovieDetail;
