import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import CollectionCard from "../components/CollectionCard";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import { useSettings } from "../settings/useSettings";
import CollectionFormModal from "../components/CollectionFormModal";
import { isChecklistItemOwned } from "../utils/checklist";
import Drawer from "../components/Drawer";
import CollectionDetail from "../features/collections/CollectionDetail";
import MovieDetail from "../features/movies/MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useAllChecklistItems, useCollections } from "../features/collections/api";
import { movieKeys, useMovies } from "../features/movies/api";

// Same grid as the movie list's poster view
const POSTER_GRID =
  "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-8";

function CollectionsView() {
  // "Show completion on collection posters" from the Settings page
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  // Loaded once and shared with the collection drawer; saving anywhere refreshes them
  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const { data: movies = [], isLoading: moviesLoading } = useMovies();
  const { data: collectionListItems = {} } = useAllChecklistItems();
  const loading = collectionsLoading || moviesLoading;
  // Fills the screen below the header and above the mobile bottom bar
  const { ref: viewportRef, style: viewportStyle } = useFillViewportHeight<HTMLDivElement>([loading]);
  const [showCreateInput, setShowCreateInput] = useState(false);

  // The collection open in a drawer (?collection=name), and a movie opened from it in a second
  // drawer on top (?movie=id); Back closes the top one first
  const {
    openId: openCollectionName,
    open: openCollection,
    close: closeCollection,
    replace: replaceCollection,
  } = useDrawerParam("collection");
  const { openId: openMovieId, open: openMovie, close: closeMovie } = useDrawerParam("movie");

  // Fallback cover for a collection created without one: the earliest-released movie in it with a poster
  const getCoverPath = (collectionName: string) =>
    movies
      .filter((m) => m.posterPath && m.collections?.includes(collectionName))
      .sort((a, b) => (a.year || 9999) - (b.year || 9999))[0]?.posterPath;

  const getCompletionPercentage = (
    collectionId: number,
    collectionName: string,
  ) => {
    const listItems = collectionListItems[collectionId] || [];
    if (listItems.length === 0) return null;

    // Same check as the collection's own checklist: the movie must be in this collection
    const inCollection = movies.filter((m) => m.collections?.includes(collectionName));
    const ownedCount = listItems.filter((item) =>
      isChecklistItemOwned(item, inCollection),
    ).length;

    return Math.round((ownedCount / listItems.length) * 100);
  };

  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      <div ref={viewportRef} className="flex flex-col h-[calc(100dvh-9rem)] pt-2" style={viewportStyle}>
        {/* Scrollable content section */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-12 pb-8">
          <>
              {/* Standard Collections Section */}
              <div className="mb-12 pt-2">
                  <div className={POSTER_GRID}>
                    {/* New collection: poster-shaped to line up with the cards */}
                    <button
                      onClick={() => setShowCreateInput(true)}
                      className="aspect-2/3 bg-gray-800 hover:bg-gray-700 rounded border-2 border-dashed border-gray-600 hover:border-indigo-500 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="New collection"
                    >
                      <span className="text-5xl text-gray-500">+</span>
                    </button>
                    {collections
                      .filter((c) => !c.isDirectorCollection)
                      .map((collection) => {
                        const completionPercentage = getCompletionPercentage(
                          collection.id,
                          collection.name,
                        );

                        return (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            completionPercentage={
                              settings.showCollectionCompletion ? completionPercentage : null
                            }
                            coverPath={collection.imageUrl || getCoverPath(collection.name)}
                            onOpen={() => openCollection(collection.name)}
                          />
                        );
                      })}
                  </div>
                </div>

              {/* Director Collections Section */}
              {collections.filter((c) => c.isDirectorCollection).length > 0 && (
                <div>
                  <div className="flex mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Director Collections</h2>
                  </div>
                  <div className={POSTER_GRID}>
                    {collections
                      .filter((c) => c.isDirectorCollection)
                      .map((collection) => {
                        const completionPercentage = getCompletionPercentage(
                          collection.id,
                          collection.name,
                        );

                        return (
                          <CollectionCard
                            key={collection.id}
                            collection={collection}
                            completionPercentage={
                              settings.showCollectionCompletion ? completionPercentage : null
                            }
                            coverPath={collection.imageUrl || getCoverPath(collection.name)}
                            onOpen={() => openCollection(collection.name)}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </>
        </div>

      {openCollectionName && (
        <Drawer label="Collection details" onClose={closeCollection}>
          <CollectionDetail
            key={openCollectionName}
            collectionName={openCollectionName}
            onOpenMovie={openMovie}
            onSaved={(updated) => replaceCollection(updated.name)}
            onDeleted={closeCollection}
          />
        </Drawer>
      )}
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie}>
          <MovieDetail
            key={openMovieId}
            movieId={openMovieId}
            onDeleted={() => {
              closeMovie();
              // The movie page deletes on its own (not through the shared cache yet), so refresh
              // the movies the cards and the collection drawer show
              queryClient.invalidateQueries({ queryKey: movieKeys.all });
            }}
          />
        </Drawer>
      )}
      {showCreateInput && (
        <CollectionFormModal
          movies={movies}
          existingNames={collections.map((c) => c.name)}
          onClose={() => setShowCreateInput(false)}
          onSaved={() => setShowCreateInput(false)}
        />
      )}
      </div>
    </>
  );
}

export default CollectionsView;
