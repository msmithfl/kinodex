import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { DrawerActionsSlotContext } from "../components/drawerActions";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../utils/api";
import { useDeleteTvShow, useTvShow } from "../features/tvShows/api";
import { Stars } from "../components/StarRating";
import TmdbLink from "../components/TmdbLink";
import { FaEdit, FaTrash } from "react-icons/fa";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import ConfirmDialog from "../components/ConfirmDialog";
import ImageLightbox from "../components/ImageLightbox";
import LoadingSpinner from "../components/LoadingSpinner";
import { EditTvShowModal } from "../components/EditTvShowModal";
import TvShowSeasons from "../features/tvShows/TvShowSeasons";
import TvShowPurchaseList from "../features/tvShows/TvShowPurchaseList";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";

interface TvShowDetailProps {
  // Show this TV show inside a drawer instead of reading the id from the /tv-shows/:id route
  showId?: string;
  // Drawer mode: called after the show is deleted, instead of navigating to the list
  onDeleted?: () => void;
}

function TvShowDetail({ showId, onDeleted }: TvShowDetailProps = {}) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = showId ?? params.id;
  const inDrawer = showId !== undefined;
  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);
  // The page's layout switches at the window's lg width, which a narrower drawer would also hit.
  // So the drawer gets its own classes: the poster small on the left, title and year, genres, then
  // rating and TMDB beside it at the bottom; edit and delete in the header's bottom-right corner.
  const layout = (pageClasses: string, drawerClasses: string) =>
    inDrawer ? drawerClasses : pageClasses;
  // From the shared cache: opening from the list shows the list's copy straight away
  const { data: show, isLoading: loading, error } = useTvShow(id);
  const deleteTvShow = useDeleteTvShow();
  const notFound = error instanceof ApiError && error.status === 404;
  const loadError = !error
    ? ""
    : notFound
      ? "TV show not found"
      : error instanceof ApiError
        ? `Could not load this TV show (${error.status}).`
        : "Could not reach the server to load this TV show.";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  // Size the page to the viewport below the header
  const { ref: containerRef, style: containerStyle } = useFillViewportHeight<HTMLDivElement>([loading]);

  // As a page, a show that doesn't exist (or isn't yours) goes back to the list; in a drawer it
  // just says so in the panel
  useEffect(() => {
    if (notFound && !inDrawer) navigate("/tv-shows");
  }, [notFound, inDrawer, navigate]);

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleteError("");
    if (id === undefined) return;
    try {
      // Every screen listing shows refreshes itself
      await deleteTvShow.mutateAsync(id);
      if (onDeleted) onDeleted();
      else navigate("/tv-shows");
    } catch (error) {
      console.error("Error deleting TV show:", error);
      setDeleteError(
        error instanceof ApiError
          ? `Failed to delete ${show?.title ?? "this TV show"} (${error.status}). Please try again.`
          : "Could not reach the server. Please check your connection.",
      );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!show) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-400">
          {loadError || "TV show not found"}
        </p>
      </div>
    );
  }

  // The TMDB logo link: beside the year on the page, after the rating in the drawer from tablet up
  const tmdbLink = <TmdbLink kind="tv" tmdbId={show.tmdbId} />;

  // Edit and delete, placed per screen size: over the backdrop on mobile, at the bottom on tablet,
  // and in the header's bottom-right corner on desktop
  const actionButtons = (
    <>
      <button
        onClick={() => setShowEditModal(true)}
        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Edit TV show"
      >
        <FaEdit className="w-5 h-5" />
      </button>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Delete TV show"
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
      {show.backdropPath && (
        <>
          {/* Desktop: fixed background scoped to this container */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${show.backdropPath})`,
              // The page pins it to the window; the drawer centres it within the panel instead
              backgroundAttachment: inDrawer ? "scroll" : "fixed",
              backgroundSize: "cover",
              backgroundPosition: inDrawer ? "center" : "top center",
            }}
          />
          <div className="hidden md:block absolute inset-0 pointer-events-none bg-linear-to-b from-gray-900/60 via-gray-900/80 to-gray-900" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto z-10 md:relative md:inset-auto md:flex-1 md:min-h-0 md:z-auto">
          {/* Mobile: in-flow hero banner that scrolls away with the content */}
          {show.backdropPath && (
            <div className="relative h-56 md:hidden pointer-events-none">
              <img
                src={show.backdropPath}
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
          {!show.backdropPath && (
            <div className="md:hidden flex gap-1 px-2 pt-2">{actionButtons}</div>
          )}
          {/* Shown at the top, near the delete button on mobile and desktop */}
          {deleteError && (
            <p className="text-red-400 text-sm text-center px-4 pt-2">
              {deleteError}
            </p>
          )}
          <div className={layout("mx-auto max-w-4xl lg:max-w-6xl pt-2 md:pt-6 lg:px-6", "mx-auto max-w-4xl pt-2 md:pt-6")}>
            {/* Mobile and tablet: one column, title block beside the poster at the top.
                Desktop: a grid with the title block across the top, details on the left and the poster on the right.
                The header's wrappers use lg:contents so the title block and poster become grid items on desktop
                without changing the mobile markup. */}
            <div className={layout("overflow-hidden lg:overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-10 lg:gap-y-4 lg:items-start", "overflow-hidden")}>
              {/* Show Details Header */}
              <div className={layout("px-4 pb-4 border-b-[0.5px] border-white/20 lg:contents", "relative px-4 md:px-6 pb-4 border-b-[0.5px] border-white/20")}>
                <div className={layout("flex justify-between md:justify-start gap-4 md:gap-0 lg:contents", "flex justify-between md:justify-start gap-4 md:gap-6")}>
                  {/* Title, Year, Rating, Genres. Desktop: title, year and TMDB on one line, genres below, stars below that */}
                  <div className={layout("md:ml-10 lg:ml-0 flex flex-col justify-center lg:flex-row lg:flex-wrap lg:justify-start lg:items-center lg:gap-x-4 lg:gap-y-1 lg:col-span-2 lg:row-start-1 lg:px-4 lg:pb-3 lg:border-b-[0.5px] lg:border-white/20 lg:relative", "min-w-0 flex flex-col justify-center gap-1 md:flex-row md:flex-wrap md:items-center md:justify-start md:content-end md:gap-x-3 md:gap-y-2")}>
                    {/* Desktop: edit and delete in the header's bottom-right corner */}
                    <div className={layout("hidden lg:flex absolute right-4 bottom-2 gap-1", "hidden")}>
                      {actionButtons}
                    </div>
                    <h1 className={layout("text-xl lg:text-3xl font-bold text-white lg:order-1", "text-xl lg:text-3xl font-bold text-white md:order-1")}>
                      {show.title}
                    </h1>

                    <div className={layout("flex items-center gap-4 lg:gap-3 lg:order-2", "flex items-center gap-4 md:gap-3 md:order-2")}>
                      <p className="text-sm lg:text-xl text-white">
                        {show.year || (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                      {/* Beside the year, except in the drawer from tablet up, where it follows the rating */}
                      <span className={layout("contents", "contents md:hidden")}>{tmdbLink}</span>

                    </div>

                    <div className={layout("flex gap-1 items-center lg:order-4 lg:basis-full", "flex gap-1 items-center md:order-4 md:basis-full")}>
                      <Stars rating={show.rating} size="md" />
                      {/* Drawer from tablet up: TMDB follows the rating */}
                      {inDrawer && (
                        <span className="hidden md:inline-flex ml-2">{tmdbLink}</span>
                      )}
                    </div>

                    <div className={layout("lg:order-3 lg:basis-full", "md:order-3 md:basis-full")}>
                      {show.genres.length > 0 ? (
                        <p className="text-sm mt-1 lg:mt-0">{show.genres.join(", ")}</p>
                      ) : (
                        <p className="text-gray-500 italic text-sm lg:text-base">
                          No genres
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Poster; desktop: right column, stays in view while the details scroll */}
                  <div className={layout("lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4", "shrink-0 md:order-first")}>
                    {show.posterPath ? (
                      // Click to see the poster large
                      <button
                        type="button"
                        onClick={() => setShowPosterLightbox(true)}
                        className="block cursor-zoom-in"
                        aria-label={`Enlarge the ${show.title} poster`}
                      >
                        <img
                          src={show.posterPath}
                          alt={`${show.title} poster`}
                          className={layout("border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-60 lg:max-w-none lg:w-full object-cover", "border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-28 object-cover")}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://via.placeholder.com/300x450?text=No+Poster";
                          }}
                        />
                      </button>
                    ) : (
                      <div className="bg-gray-700 border-[0.5px] border-white/20 rounded-lg flex items-center justify-center h-full min-h-75 px-4">
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
                <div className="mb-8">
                  <TvShowSeasons show={show} />
                  <TvShowPurchaseList show={show} />

                  <div className="flex p-4 border-b-[0.5px] border-white/20">
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Watched
                      </h3>
                      <p className="text-base text-white flex items-center gap-2">
                        {show.hasWatched ? (
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
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Streaming
                      </h3>
                      <p className="text-base text-white flex items-center gap-2">
                        {show.isOnPlex ? (
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

                {/* Review and actions */}
                <div className="mb-8">
                  <div className="m-4 p-6 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">
                      Review / Notes
                    </h3>
                    {show.review ? (
                      <p className="text-white whitespace-pre-wrap">
                        {show.review}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">
                        No review or notes added
                      </p>
                    )}
                  </div>
                  {/* Tablet only; mobile and desktop show these near the top */}
                  <div className={layout("hidden md:flex lg:hidden justify-center gap-2 mt-2", "hidden")}>
                    {actionButtons}
                  </div>
                </div>
              </div>
            </div>

            {showPosterLightbox && show.posterPath && (
              <ImageLightbox
                src={show.posterPath}
                alt={`${show.title} poster`}
                onClose={() => setShowPosterLightbox(false)}
              />
            )}

            {showEditModal && (
              <EditTvShowModal
                show={show}
                onClose={() => setShowEditModal(false)}
                // Saving refreshes this show and the list behind the drawer; nothing to reload
                onSaved={() => setShowEditModal(false)}
                onDeleted={() => (onDeleted ? onDeleted() : navigate("/tv-shows"))}
              />
            )}

            <ConfirmDialog
              isOpen={showDeleteConfirm}
              title="Delete TV Show"
              message={`Are you sure you want to delete ${show.title}? This action cannot be undone.`}
              confirmText="Delete"
              cancelText="Cancel"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TvShowDetail;
