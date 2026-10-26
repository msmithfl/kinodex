import { useState, useContext } from "react";
import { createPortal } from "react-dom";
import { DrawerActionsSlotContext } from "../components/drawerActions";
import ConfirmDialog from "../components/ConfirmDialog";
import CollectionFormModal from "../components/CollectionFormModal";
import Counter from "../components/Counter";
import SimpleMovieTable from "../components/SimpleMovieTable";
import MoviePosterCard from "../components/MovieCardPoster";
import { FaTrash, FaEdit } from "react-icons/fa";
import ViewToggle from "../components/ViewToggle";
import { TABLE_VIEW_OPTIONS } from "../utils/viewOptions";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import CollectionChecklist from "../features/collections/CollectionChecklist";
import { useCollections, useDeleteCollection } from "../features/collections/api";
import { useMovies } from "../features/movies/api";
import type { Collection } from "../types";

interface CollectionDetailProps {
  collectionName: string;
  // A movie in the collection was clicked: open it (in a drawer over this one)
  onOpenMovie: (movieId?: number) => void;
  // Edited (possibly under a new name, which whatever tracks the open collection should follow)
  onSaved: (collection: Collection) => void;
  onDeleted: () => void;
}

// A collection's movies and its checklist, shown in a drawer over the Collections page
function CollectionDetail({
  collectionName,
  onOpenMovie,
  onSaved,
  onDeleted,
}: CollectionDetailProps) {
  // Shared with the Collections page, so opening the drawer usually needs no new requests
  const { data: allMovies = [], isLoading: moviesLoading } = useMovies();
  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const deleteCollection = useDeleteCollection();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // A table like the Movies and TV Shows lists, or a poster grid
  const [viewMode, setViewMode] = useState<"table" | "poster">(() => {
    try {
      return localStorage.getItem("collectionViewMode") === "poster" ? "poster" : "table";
    } catch {
      return "table";
    }
  });

  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);

  const handleViewModeChange = (mode: "table" | "poster") => {
    setViewMode(mode);
    try {
      localStorage.setItem("collectionViewMode", mode);
    } catch {
      // Storage unavailable; the choice just isn't remembered
    }
  };

  const handleDeleteConfirm = () => {
    if (!collection) return;
    deleteCollection.mutate(collection.id, {
      onSuccess: onDeleted,
      onError: (error) => console.error("Error deleting collection:", error),
      onSettled: () => setShowDeleteConfirm(false),
    });
  };

  if (moviesLoading || collectionsLoading) {
    return <LoadingSpinner />;
  }

  const collection = collections.find((c) => c.name === collectionName) ?? null;
  // The collection's movies in release order
  const movies = allMovies
    .filter((movie) => movie.collections?.includes(collectionName))
    .sort((a, b) => a.year - b.year);
  // The collection's own backdrop, or else the first movie's (in release order) that has one
  const backdropUrl =
    collection?.backdropUrl || movies.find((m) => m.backdropPath)?.backdropPath;

  // Edit and delete: floating beside the drawer's close button from tablet up, in the header on mobile
  const actionButtons = (
    <>
      <button
        onClick={() => setShowEditModal(true)}
        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Edit collection"
      >
        <FaEdit className="w-5 h-5" />
      </button>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Delete collection"
      >
        <FaTrash className="w-5 h-5" />
      </button>
    </>
  );

  return (
    // Fills the drawer and scrolls within it
    <>
      {collection &&
        actionsSlot &&
        createPortal(
          <div className="flex flex-col rounded-full bg-gray-900/80 border border-white/10 shadow-lg backdrop-blur-sm [&>button]:rounded-full [&>button]:p-3">
            {actionButtons}
          </div>,
          actionsSlot,
        )}
      <div className="relative flex h-full">
        {/* The backdrop, faded behind the top of the drawer */}
        {backdropUrl && (
          <div className="absolute inset-x-0 top-0 h-96 pointer-events-none" aria-hidden="true">
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover object-center opacity-30"
            />
            <div className="absolute inset-x-0 top-0 -bottom-0.5 bg-linear-to-b from-gray-900/20 to-gray-900" />
          </div>
        )}
        {/* With a backdrop, the header starts lower (about 100px) so more of it shows above the title */}
        <div
          className={`relative flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pt-4 pb-8 ${backdropUrl ? "md:pt-30" : "md:pt-6"}`}
        >
          <div>
            {/* Mobile: edit and delete above the title, level with the drawer's close button in the
                top-right corner (-mt-1 centres these 36px buttons on it, at 30px from the top) */}
            {collection && (
              <div
                className={`md:hidden flex w-fit -mt-1 rounded-md bg-gray-900/70 backdrop-blur-sm ${backdropUrl ? "mb-20" : "mb-6"}`}
              >
                {actionButtons}
              </div>
            )}
            <h1 className="min-w-0 text-3xl font-bold">{collectionName}</h1>
            {/* The movie count, with the view toggle on the same line */}
            <div className="flex items-center justify-between gap-4 mt-1 mb-3">
              <Counter count={movies.length} />
              <ViewToggle
                value={viewMode}
                options={TABLE_VIEW_OPTIONS}
                onChange={handleViewModeChange}
              />
            </div>
          </div>

          {/* Owned Movies Section */}
          <div className="mb-12">
            {movies.length === 0 ? (
              <EmptyState message="No movies in this collection yet." />
            ) : viewMode === "poster" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-8">
                {movies.map((movie) => (
                  <MoviePosterCard
                    key={movie.id}
                    movie={movie}
                    captionBelow
                    onOpen={() => onOpenMovie(movie.id)}
                  />
                ))}
              </div>
            ) : (
              <SimpleMovieTable
                movies={movies}
                onOpen={onOpenMovie}
                showRating={false}
                fitWidth
              />
            )}
          </div>

          {collection && <CollectionChecklist collection={collection} ownedMovies={movies} />}

          {showEditModal && collection && (
            <CollectionFormModal
              collection={collection}
              movies={allMovies}
              existingNames={collections.map((c) => c.name)}
              onClose={() => setShowEditModal(false)}
              onSaved={(updated) => {
                setShowEditModal(false);
                onSaved(updated);
              }}
            />
          )}

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Delete Collection"
            message={`Are you sure you want to delete "${collectionName}"? This will remove it from all movies but won't delete the movies themselves.`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </div>
      </div>
    </>
  );
}

export default CollectionDetail;
