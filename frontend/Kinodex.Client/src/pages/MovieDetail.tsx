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
import SubNavigation from "../components/SubNavigation";
import { FormatIcon } from "../utils/formatIcon";
import { FaBarcode } from "react-icons/fa6";

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
    <div className="relative h-[calc(100vh-5rem)] flex flex-col">
      {movie.backdropPath && (
        <>
          {/* Mobile: absolute banner */}
          <div className="absolute top-0 left-0 right-0 h-56 overflow-hidden md:hidden pointer-events-none">
            <img
              src={movie.backdropPath}
              alt=""
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-linear-to-b from-gray-900/20 to-gray-900" />
          </div>
          {/* Desktop: fixed background scoped to this container */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${movie.backdropPath})`,
              backgroundAttachment: "fixed",
              backgroundSize: "cover",
              backgroundPosition: "top center",
            }}
          />
          <div className="hidden md:block absolute inset-0 pointer-events-none bg-linear-to-b from-gray-900/60 via-gray-900/80 to-gray-900" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <SubNavigation />
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl pt-2 mt-40 md:mt-0">
          <div className="overflow-hidden">
            {/* Movie Details Header */}
            <div className="px-4 pb-4 border-b-[0.5px] border-white/20">
              <div className="flex justify-between md:justify-start gap-4 md:gap-0">
                {/* Title, Year, Rating, Genres - Center */}
                <div className="md:ml-10 flex flex-col justify-center lg:space-y-4">
                  <div className="flex items-center">
                    <h1 className="text-xl lg:text-3xl font-bold text-white">
                      {movie.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-sm lg:text-xl text-white">
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
                            className="text-sm mt-1 cursor-pointer hover:underline"
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
                </div>
                {/* Poster */}
                <div className="lg:order-first">
                  {movie.posterPath ? (
                    <img
                      src={movie.posterPath}
                      alt={`${movie.title} poster`}
                      className="border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-60 object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://via.placeholder.com/300x450?text=No+Poster";
                      }}
                    />
                  ) : (
                    <div className="bg-gray-700 border-[0.5px] border-white/20 rounded-lg flex items-center justify-center h-full min-h-75">
                      <p className="text-gray-500 text-xs lg:text-base">
                        No poster
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              {/* Physical Details Section */}
              <div className="mb-8">
                <div>
                  <div className="flex p-4 border-b-[0.5px] border-white/20">
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Formats
                      </h3>
                      {movie.formats && movie.formats.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {[...movie.formats].sort().map((fmt, idx) => (
                            <FormatIcon key={idx} fmt={fmt} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">None</p>
                      )}
                    </div>
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Condition
                      </h3>
                      <span>{movie.condition}</span>
                    </div>
                  </div>

                  <div className="flex p-4 border-b-[0.5px] border-white/20">
                    <div className="w-1/2 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">
                          Purchase Price
                        </h3>
                        <p className="text-base font-mono text-white">
                          {movie.purchasePrice > 0 ? (
                            `$${movie.purchasePrice.toFixed(2)}`
                          ) : (
                            <span className="text-gray-500">Not set</span>
                          )}
                        </p>
                      </div>
                      <div>
                        {/* <h3 className="text-sm font-medium text-gray-400 mb-2">
                          UPC Number
                        </h3> */}
                        <div className="relative inline-block">
                          <button
                            onClick={() => {
                              const query = encodeURIComponent(
                                `${movie.upcNumber}`,
                              );
                              window.open(
                                `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&rt=nc&LH_ItemCondition=4`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-xs lg:text-sm cursor-pointer w-auto lg:w-full"
                          >
                            Search eBay
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="w-1/2 flex items-end">
                      {/* Product Image & eBay Button - Right */}
                      <div className="flex flex-col items-start gap-4">
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
                        <div className="relative inline-block">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(movie.upcNumber);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            title="Copy to clipboard"
                            className="text-base font-mono text-white rounded-md cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <FaBarcode />
                              <p className="text-base font-mono text-white">
                                {movie.upcNumber}
                              </p>
                            </div>
                          </button>
                          {copied && (
                            <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 text-green-400 text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                              Copied!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex p-4 border-b-[0.5px] border-white/20">
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Shelf Section
                      </h3>
                      <Link
                        to={`/shelfsections/${encodeURIComponent(movie.shelfSection || "Unshelved")}`}
                        className="cursor-pointer hover:underline"
                      >
                        {movie.shelfSection || "Unshelved"}
                      </Link>
                    </div>
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Shelf Number
                      </h3>
                      <p className="text-base font-mono text-white">
                        {movie.shelfNumber > 0 ? (
                          `${movie.shelfNumber}`
                        ) : (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex p-4 border-b-[0.5px] border-white/20">
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        HDD Number
                      </h3>
                      <p className="text-base font-mono text-white">
                        {movie.hdDriveNumber > 0 ? (
                          `${movie.hdDriveNumber}`
                        ) : (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                    </div>

                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Streaming
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

                  {/* Location Details Section */}
                  <div className="flex p-4 border-b-[0.5px] border-white/20">
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
                  </div>

                  <div className="flex flex-col p-4 border-b-[0.5px] border-white/20">
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

              {/* Metadata Section */}
              <div className="mb-8">
                <div className="m-4 p-6 bg-gray-700 rounded-lg">
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
                <div className="flex justify-center gap-2 mt-2">
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
      </div>
    </div>
  );
}

export default MovieDetail;
