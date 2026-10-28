import { useState, useContext } from "react";
import { createPortal } from "react-dom";
import { DrawerActionsSlotContext } from "../../components/drawerActions";
import { ApiError } from "../../utils/api";
import { useDeleteTvShow, useTvShow } from "./api";
import { Stars } from "../../components/StarRating";
import TmdbLink from "../../components/TmdbLink";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDialog from "../../components/ConfirmDialog";
import ImageLightbox from "../../components/ImageLightbox";
import LoadingSpinner from "../../components/LoadingSpinner";
import { EditTvShowModal } from "../../components/EditTvShowModal";
import TvShowDrawerDetails from "./TvShowDrawerDetails";

interface TvShowDetailProps {
  showId: string;
  // Called after the show is deleted (usually closes the drawer)
  onDeleted: () => void;
}

// A TV show's details, shown in the side drawer (the only detail view; the old full page is
// retired and /tv-shows/:id redirects to the list with this drawer open). The poster small on the
// left, title and year, genres, then rating and TMDB beside it; the details below.
function TvShowDetail({ showId, onDeleted }: TvShowDetailProps) {
  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);
  // From the shared cache: opening from the list shows the list's copy straight away
  const { data: show, isLoading: loading, error } = useTvShow(showId);
  const deleteTvShow = useDeleteTvShow();
  const loadError = !error
    ? ""
    : error instanceof ApiError && error.status === 404
      ? "TV show not found"
      : error instanceof ApiError
        ? `Could not load this TV show (${error.status}).`
        : "Could not reach the server to load this TV show.";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  const [showProductLightbox, setShowProductLightbox] = useState(false);

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleteError("");
    try {
      // Every screen listing shows refreshes itself
      await deleteTvShow.mutateAsync(showId);
      onDeleted();
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

  // The TMDB logo link: beside the year on mobile, after the rating from tablet up
  const tmdbLink = <TmdbLink kind="tv" tmdbId={show.tmdbId} />;

  // Edit and delete: over the backdrop on mobile, beside the drawer's close button from tablet up
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
    <div className="relative flex flex-col h-full">
      {/* From tablet up: edit and delete float below the close button, outside the panel */}
      {actionsSlot &&
        createPortal(
          <div className="flex flex-col rounded-full bg-gray-900/80 border border-white/10 shadow-lg backdrop-blur-sm [&>button]:rounded-full [&>button]:p-3">
            {actionButtons}
          </div>,
          actionsSlot,
        )}
      {show.backdropPath && (
        <>
          {/* Tablet up: the backdrop faintly behind the whole panel */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${show.backdropPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
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
          {/* Shown at the top, near the delete button */}
          {deleteError && (
            <p className="text-red-400 text-sm text-center px-4 pt-2">
              {deleteError}
            </p>
          )}
          <div className="mx-auto max-w-4xl pt-2 md:pt-6">
            <div className="overflow-hidden">
              {/* Show Details Header */}
              <div className="relative px-4 md:px-6 pb-4 border-b-[0.5px] border-white/20">
                <div className="flex justify-between md:justify-start gap-4 md:gap-6">
                  {/* Title, Year, Rating, Genres */}
                  <div className="min-w-0 flex flex-col justify-center gap-1 md:flex-row md:flex-wrap md:items-center md:justify-start md:content-end md:gap-x-3 md:gap-y-2">
                    <h1 className="text-xl lg:text-3xl font-bold text-white md:order-1">
                      {show.title}
                    </h1>

                    <div className="flex items-center gap-4 md:gap-3 md:order-2">
                      <p className="text-sm lg:text-xl text-white">
                        {show.year || (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                      {/* Beside the year on mobile; from tablet up it follows the rating */}
                      <span className="contents md:hidden">{tmdbLink}</span>
                    </div>

                    <div className="flex gap-1 items-center md:order-4 md:basis-full">
                      <Stars rating={show.rating} size="md" />
                      <span className="hidden md:inline-flex ml-2">{tmdbLink}</span>
                    </div>

                    <div className="md:order-3 md:basis-full">
                      {show.genres.length > 0 ? (
                        <p className="text-sm mt-1 lg:mt-0">{show.genres.join(", ")}</p>
                      ) : (
                        <p className="text-gray-500 italic text-sm lg:text-base">
                          No genres
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Poster */}
                  <div className="shrink-0 md:order-first">
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
                          className="border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-28 object-cover"
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

              {/* Details */}
              <div className="min-w-0">
                <TvShowDrawerDetails
                  show={show}
                  onEnlargeProductImage={() => setShowProductLightbox(true)}
                />
              </div>
            </div>

            {showProductLightbox && show.productPosterPath && (
              <ImageLightbox
                src={show.productPosterPath}
                alt={`${show.title} product`}
                onClose={() => setShowProductLightbox(false)}
              />
            )}

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
                onDeleted={onDeleted}
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
