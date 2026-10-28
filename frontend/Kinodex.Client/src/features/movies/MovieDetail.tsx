import { useState, useContext } from "react";
import { createPortal } from "react-dom";
import { DrawerActionsSlotContext } from "../../components/drawerActions";
import { Link } from "react-router-dom";
import { useDeleteMovie, useMovie } from "./api";
import { Stars } from "../../components/StarRating";
import TmdbLink from "../../components/TmdbLink";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDialog from "../../components/ConfirmDialog";
import ImageLightbox from "../../components/ImageLightbox";
import LoadingSpinner from "../../components/LoadingSpinner";
import { EditMovieModal } from "../../components/EditMovieModal";
import MovieDrawerDetails from "./MovieDrawerDetails";

interface MovieDetailProps {
  movieId: string;
  // Called after the movie is deleted (usually closes the drawer)
  onDeleted: () => void;
}

// The movie drawer's sections, shown as tabs under its header once there's more than one.
// Planned: a lending ledger and a watch log (on hold until the core features are solid).
type DrawerTab = "details";
const DRAWER_TABS: { id: DrawerTab; label: string }[] = [{ id: "details", label: "Details" }];

// A movie's details, shown in the side drawer (the only detail view; the old full page is retired
// and /movie/:id redirects to the library with this drawer open). Title, year, rating and genres
// on the left with the poster beside them, the details full width below.
function MovieDetail({ movieId, onDeleted }: MovieDetailProps) {
  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);
  // From the shared cache: opening from a list shows the list's copy straight away
  const { data: movie, isLoading: loading } = useMovie(movieId);
  const deleteMovie = useDeleteMovie();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  const [showProductLightbox, setShowProductLightbox] = useState(false);
  // Which section shows under the header
  const [tab, setTab] = useState<DrawerTab>("details");

  const handleDeleteConfirm = () => {
    deleteMovie.mutate(movieId, {
      // Every list showing the movie refreshes itself
      onSuccess: onDeleted,
      onError: (error) => console.error("Error deleting movie:", error),
      onSettled: () => setShowDeleteConfirm(false),
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not yours, deleted, or a bad id in the URL
  if (!movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-400">Movie not found</p>
      </div>
    );
  }

  // The TMDB logo link: beside the year on mobile, after the rating from tablet up
  const tmdbLink = <TmdbLink kind="movie" tmdbId={movie.tmdbId} />;

  // Edit and delete: over the backdrop on mobile, beside the drawer's close button from tablet up
  const actionButtons = (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Edit movie"
      >
        <FaEdit className="w-5 h-5" />
      </button>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Delete movie"
      >
        <FaTrash className="w-5 h-5" />
      </button>
    </>
  );

  return (
    <div className="relative flex flex-col h-full">
      {/* From tablet up: edit and delete float below the close button, outside the panel */}
      {actionsSlot &&
        createPortal(
          <div className="flex flex-col rounded-full bg-gray-900/80 border border-white/10 shadow-lg backdrop-blur-sm [&>button]:rounded-full [&>button]:p-3">
            {actionButtons}
          </div>,
          actionsSlot,
        )}
      {movie.backdropPath && (
        <>
          {/* Tablet up: the backdrop faintly behind the whole panel */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${movie.backdropPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="hidden md:block absolute inset-0 pointer-events-none bg-linear-to-b from-gray-900/60 via-gray-900/80 to-gray-900" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto z-10 md:relative md:inset-auto md:flex-1 md:min-h-0 md:z-auto">
          {/* Mobile: in-flow hero banner — scrolls away with content */}
          {movie.backdropPath && (
            <div className="relative h-56 md:hidden pointer-events-none">
              <img
                src={movie.backdropPath}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-x-0 top-0 -bottom-0.5 bg-linear-to-b from-gray-900/20 to-gray-900" />
              {/* Mobile: edit and delete over the backdrop's top-left corner */}
              <div className="absolute top-3 left-3 flex gap-1 rounded-md bg-gray-900/70 backdrop-blur-sm pointer-events-auto">
                {actionButtons}
              </div>
            </div>
          )}
          {/* Mobile without a backdrop: same buttons, top-left above the title */}
          {!movie.backdropPath && (
            <div className="md:hidden flex gap-1 px-2 pt-2">{actionButtons}</div>
          )}
          <div className="mx-auto max-w-4xl pt-2 md:pt-6">
            <div className="overflow-hidden">
              {/* Movie Details Header */}
              <div className="relative px-4 md:px-6 pb-4 border-b-[0.5px] border-white/20">
                <div className="flex justify-between md:justify-start gap-4 md:gap-6">
                  {/* Title, Year, Rating, Genres */}
                  <div className="min-w-0 flex flex-col justify-center gap-1 md:flex-row md:flex-wrap md:items-center md:justify-start md:content-end md:gap-x-3 md:gap-y-2">
                    <div className="flex items-center md:order-1">
                      <h1 className="text-xl lg:text-3xl font-bold text-white">
                        {movie.title}
                      </h1>
                    </div>

                    <div className="flex items-center gap-4 md:gap-3 md:order-2">
                      <p className="text-sm lg:text-xl text-white">
                        {movie.year || (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                      {/* Beside the year on mobile; from tablet up it follows the rating */}
                      <span className="contents md:hidden">{tmdbLink}</span>
                    </div>

                    <div className="md:order-4 md:basis-full">
                      <div className="flex gap-1 items-center">
                        <Stars rating={movie.rating} size="md" />
                        <span className="hidden md:inline-flex ml-2">{tmdbLink}</span>
                      </div>
                    </div>

                    <div className="md:order-3 md:basis-full">
                      {movie.genres && movie.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-1 lg:gap-2">
                          {movie.genres.map((genre, idx) => (
                            <Link
                              key={idx}
                              to={`/genres/${encodeURIComponent(genre)}`}
                              className="text-sm mt-1 lg:mt-0 cursor-pointer hover:underline"
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
                  <div className="shrink-0 md:order-first">
                    {movie.posterPath ? (
                      // Click to see the poster large
                      <button
                        type="button"
                        onClick={() => setShowPosterLightbox(true)}
                        className="block cursor-zoom-in"
                        aria-label={`Enlarge the ${movie.title} poster`}
                      >
                        <img
                          src={movie.posterPath}
                          alt={`${movie.title} poster`}
                          className="border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-28 object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://via.placeholder.com/300x450?text=No+Poster";
                          }}
                        />
                      </button>
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

              {/* Details */}
              <div className="min-w-0">
                {/* Tabs under the header, once there's more than one section */}
                {DRAWER_TABS.length > 1 && (
                  <div
                    role="tablist"
                    aria-label="Movie sections"
                    className="flex gap-6 px-4 md:px-6 border-b-[0.5px] border-white/20"
                  >
                    {DRAWER_TABS.map(({ id: tabId, label }) => (
                      <button
                        key={tabId}
                        type="button"
                        role="tab"
                        aria-selected={tab === tabId}
                        onClick={() => setTab(tabId)}
                        className={`-mb-px py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                          tab === tabId
                            ? "border-indigo-500 text-white"
                            : "border-transparent text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {tab === "details" && (
                  <MovieDrawerDetails
                    movie={movie}
                    onEnlargeProductImage={() => setShowProductLightbox(true)}
                  />
                )}
              </div>
            </div>
            {showModal && (
              <EditMovieModal movieId={movieId} onClose={() => setShowModal(false)} />
            )}

            {showProductLightbox && movie.productPosterPath && (
              <ImageLightbox
                src={movie.productPosterPath}
                alt={`${movie.title} product`}
                onClose={() => setShowProductLightbox(false)}
              />
            )}

            {showPosterLightbox && movie.posterPath && (
              <ImageLightbox
                src={movie.posterPath}
                alt={`${movie.title} poster`}
                onClose={() => setShowPosterLightbox(false)}
              />
            )}

            <ConfirmDialog
              isOpen={showDeleteConfirm}
              title="Delete Movie"
              message="Are you sure you want to delete this movie? This action cannot be undone."
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;
