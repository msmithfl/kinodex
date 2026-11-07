import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import CollectionCard from "../components/CollectionCard";
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
import type { Collection } from "../types";

// The movie list's poster widths from tablet up; phones stay 3 across, with names
const POSTER_GRID =
  "grid grid-cols-3 gap-x-3 gap-y-5 md:grid-cols-4 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8";

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
        <div className="flex flex-col gap-4 bg-background px-6 pt-4 md:px-10 md:pt-7" aria-busy="true" aria-label="Loading collections">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className={POSTER_GRID}>
            {Array.from({ length: 16 }, (_, i) => (
              <Skeleton key={i} className="aspect-2/3 rounded-[4px] md:rounded-lg" />
            ))}
          </div>
        </div>
      </>
    );
  }

  const renderCard = (collection: Collection) => (
    <CollectionCard
      key={collection.id}
      collection={collection}
      completionPercentage={
        settings.showCollectionCompletion ? getCompletionPercentage(collection.id, collection.name) : null
      }
      coverPath={collection.imageUrl || getCoverPath(collection.name)}
      onOpen={() => openCollection(collection.name)}
    />
  );
  const directorCollections = collections.filter((c) => c.isDirectorCollection);

  return (
    <>
      <SubNavigation />
      <div ref={viewportRef} className="flex h-[calc(100dvh-5rem)] flex-col bg-background" style={viewportStyle}>
        <div className="shrink-0 px-6 pt-4 pb-4 md:px-10 md:pt-7">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">Collections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {collections.length} {collections.length === 1 ? "collection" : "collections"}
          </p>
        </div>

        {/* Scrolls on its own; the small top inset keeps the hover ring and lift inside it */}
        <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto px-6 pt-2 pb-8 md:px-10">
          <div className={POSTER_GRID}>
            {/* New collection: poster-shaped to line up with the cards */}
            <button
              type="button"
              data-slot="new-collection"
              onClick={() => setShowCreateInput(true)}
              className="flex aspect-2/3 cursor-pointer items-center justify-center self-start rounded-[4px] border-2 border-dashed border-border text-muted-foreground transition-colors outline-none hover:border-primary hover:bg-primary-soft hover:text-primary-text focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:rounded-lg"
              aria-label="New collection"
            >
              <Plus className="size-8" />
            </button>
            {collections.filter((c) => !c.isDirectorCollection).map(renderCard)}
          </div>

          {directorCollections.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Director collections</h2>
              <div className={POSTER_GRID}>{directorCollections.map(renderCard)}</div>
            </section>
          )}
        </div>
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
    </>
  );
}

export default CollectionsView;
