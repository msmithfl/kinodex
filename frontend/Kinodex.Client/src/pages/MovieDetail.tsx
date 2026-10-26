import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { DrawerActionsSlotContext } from "../components/drawerActions";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDeleteMovie, useMovie } from "../features/movies/api";
import { Stars } from "../components/StarRating";
import TmdbLink from "../components/TmdbLink";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDialog from "../components/ConfirmDialog";
import ImageLightbox from "../components/ImageLightbox";
import LoadingSpinner from "../components/LoadingSpinner";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { EditMovieModal } from "../components/EditMovieModal";
import SubNavigation from "../components/SubNavigation";
import MovieDrawerDetails from "../features/movies/MovieDrawerDetails";
import MoviePageDetails from "../features/movies/MoviePageDetails";

interface MovieDetailProps {
  // Show this movie inside a drawer instead of reading the id from the /movie/:id route
  movieId?: string;
  // Drawer mode: called after the movie is deleted, instead of navigating to the library
  onDeleted?: () => void;
}

// The movie drawer's sections, shown as tabs under its header once there's more than one.
// Planned: a lending ledger and a watch log (on hold until the core features are solid).
type DrawerTab = "details";
const DRAWER_TABS: { id: DrawerTab; label: string }[] = [{ id: "details", label: "Details" }];

function MovieDetail({ movieId, onDeleted }: MovieDetailProps = {}) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = movieId ?? params.id;
  const inDrawer = movieId !== undefined;
  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);
  // The page's layout switches at the window's lg width, which a narrower drawer would also hit.
  // So the drawer gets its own classes: title, year, rating and genres on the left with the poster
  // beside them on the right, and the details full width below; actions sit at the bottom.
  const layout = (pageClasses: string, drawerClasses: string) =>
    inDrawer ? drawerClasses : pageClasses;
  // From the shared cache: opening from a list shows the list's copy straight away
  const { data: movie, isLoading: loading, isError } = useMovie(id);
  const deleteMovie = useDeleteMovie();
  // Size the page to the viewport below the header and above the mobile bottom bar
  const { ref: containerRef, style: containerStyle } = useFillViewportHeight<HTMLDivElement>([loading]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  const [showProductLightbox, setShowProductLightbox] = useState(false);
  // Drawer only: which section shows under the header
  const [tab, setTab] = useState<DrawerTab>("details");
  // As a page, a movie that can't be loaded (e.g. not yours, or deleted) goes back to the library;
  // in a drawer it just shows "Movie not found" in the panel
  useEffect(() => {
    if (isError && !inDrawer) navigate("/library");
  }, [isError, inDrawer, navigate]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (id === undefined) return;
    deleteMovie.mutate(id, {
      // Every list showing the movie refreshes itself
      onSuccess: () => {
        if (onDeleted) onDeleted();
        else navigate("/library");
      },
      onError: (error) => console.error("Error deleting movie:", error),
      onSettled: () => setShowDeleteConfirm(false),
    });
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

  // The TMDB logo link: beside the year on the page, after the rating in the drawer from tablet up
  const tmdbLink = <TmdbLink kind="movie" tmdbId={movie.tmdbId} />;

  // Edit and delete, placed per screen size: over the backdrop on mobile, at the bottom on tablet,
  // and in the header's bottom-right corner on desktop
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
        onClick={handleDeleteClick}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Delete movie"
      >
        <FaTrash className="w-5 h-5" />
      </button>
    </>
  );

  return (
    // As a page it fills the screen below the header; in a drawer it fills the panel
    <div
      ref={inDrawer ? undefined : containerRef}
      className={`relative flex flex-col ${inDrawer ? "h-full" : "h-[calc(100dvh-5rem)]"}`}
      style={inDrawer ? undefined : containerStyle}
    >
      {/* Drawer from tablet up: edit and delete float below the close button, outside the panel */}
      {inDrawer &&
        actionsSlot &&
        createPortal(
          <div className="flex flex-col rounded-full bg-gray-900/80 border border-white/10 shadow-lg backdrop-blur-sm [&>button]:rounded-full [&>button]:p-3">
            {actionButtons}
          </div>,
          actionsSlot,
        )}
      {movie.backdropPath && (
        <>
          {/* Desktop: fixed background scoped to this container */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${movie.backdropPath})`,
              // The page pins it to the window; the drawer centres it within the panel instead
              backgroundAttachment: inDrawer ? "scroll" : "fixed",
              backgroundSize: "cover",
              backgroundPosition: inDrawer ? "center" : "top center",
            }}
          >
            
          </div>
          <div className="hidden md:block absolute inset-0 pointer-events-none bg-linear-to-b from-gray-900/60 via-gray-900/80 to-gray-900" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="hidden relative z-20 md:z-auto">
          <SubNavigation />
        </div>
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
          <div className={layout("mx-auto max-w-4xl lg:max-w-6xl pt-2 md:pt-6 lg:px-6", "mx-auto max-w-4xl pt-2 md:pt-6")}>
            {/* Mobile and tablet: one column, title block beside the poster at the top.
                Desktop: a grid with the title block across the top, details on the left and the poster on the right.
                The header's wrappers use lg:contents so the title block and poster become grid items on desktop
                without changing the mobile markup. Mirrors TvShowDetail. */}
            <div className={layout("overflow-hidden lg:overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-10 lg:gap-y-4 lg:items-start", "overflow-hidden")}>
              {/* Movie Details Header */}
              <div className={layout("px-4 pb-4 border-b-[0.5px] border-white/20 lg:contents", "relative px-4 md:px-6 pb-4 border-b-[0.5px] border-white/20")}>
                <div className={layout("flex justify-between md:justify-start gap-4 md:gap-0 lg:contents", "flex justify-between md:justify-start gap-4 md:gap-6")}>
                  {/* Title, Year, Rating, Genres. Desktop: title, year and TMDB on one line, genres below, stars below that */}
                  <div className={layout("md:ml-10 lg:ml-0 flex flex-col justify-center lg:flex-row lg:flex-wrap lg:justify-start lg:items-center lg:gap-x-4 lg:gap-y-1 lg:col-span-2 lg:row-start-1 lg:px-4 lg:pb-3 lg:border-b-[0.5px] lg:border-white/20 lg:relative", "min-w-0 flex flex-col justify-center gap-1 md:flex-row md:flex-wrap md:items-center md:justify-start md:content-end md:gap-x-3 md:gap-y-2")}>
                    {/* Desktop: edit and delete in the header's bottom-right corner */}
                    <div className={layout("hidden lg:flex absolute right-4 bottom-2 gap-1", "hidden")}>
                      {actionButtons}
                    </div>
                    <div className={layout("flex items-center lg:order-1", "flex items-center md:order-1")}>
                      <h1 className="text-xl lg:text-3xl font-bold text-white">
                        {movie.title}
                      </h1>
                    </div>

                    <div className={layout("flex items-center gap-4 lg:gap-3 lg:order-2", "flex items-center gap-4 md:gap-3 md:order-2")}>
                      <p className="text-sm lg:text-xl text-white">
                        {movie.year || (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                      {/* Beside the year, except in the drawer from tablet up, where it follows the rating */}
                      <span className={layout("contents", "contents md:hidden")}>{tmdbLink}</span>
                    </div>

                    <div className={layout("lg:order-4 lg:basis-full", "md:order-4 md:basis-full")}>
                      <div className="flex gap-1 items-center">
                        <Stars rating={movie.rating} size="md" />
                        {/* Drawer from tablet up: TMDB follows the rating */}
                        {inDrawer && (
                          <span className="hidden md:inline-flex ml-2">{tmdbLink}</span>
                        )}
                      </div>
                    </div>

                    <div className={layout("lg:order-3 lg:basis-full", "md:order-3 md:basis-full")}>
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
                  {/* Poster; desktop: right column, stays in view while the details scroll */}
                  <div className={layout("lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4", "shrink-0 md:order-first")}>
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
                          className={layout("border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-60 lg:max-w-none lg:w-full object-cover", "border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-28 object-cover")}
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

              {/* Details column */}
              <div className={layout("min-w-0 lg:col-start-1 lg:row-start-2", "min-w-0")}>
                {/* Drawer: tabs under the header (when there's more than one section); the page
                    shows the details alone */}
                {inDrawer && DRAWER_TABS.length > 1 && (
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
                {inDrawer && tab === "details" && (
                  <MovieDrawerDetails
                    movie={movie}
                    onEnlargeProductImage={() => setShowProductLightbox(true)}
                  />
                )}
                {!inDrawer && (
                  <MoviePageDetails
                    movie={movie}
                    onEnlargeProductImage={() => setShowProductLightbox(true)}
                    actionButtons={actionButtons}
                  />
                )}
              </div>
            </div>
            {showModal && (
              <EditMovieModal movieId={id} onClose={() => setShowModal(false)} />
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
              onCancel={handleDeleteCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;
