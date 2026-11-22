import { useState } from "react";
import { Plus } from "lucide-react";
import ListSkeleton from "../components/ListSkeleton";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { POSTER_GRID_CAPTIONED } from "../components/posterGrid";
import CollectionCard from "../components/CollectionCard";
import { useSettings } from "../settings/useSettings";
import CollectionFormModal from "../components/CollectionFormModal";
import { isChecklistItemOwned } from "../utils/checklist";
import Drawer from "../components/Drawer";
import CollectionDetail from "../features/collections/CollectionDetail";
import MovieDetail from "../features/movies/MovieDetail";
import TvShowDetail from "../features/tvShows/TvShowDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useAllChecklistItems, useCollections } from "../features/collections/api";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
import { collectionCover } from "../utils/collectionCover";
import type { Collection } from "../types";

function CollectionsView() {
  // "Show completion on collection posters" from the Settings page
  const { settings } = useSettings();
  // Loaded once and shared with the collection drawer; saving anywhere refreshes them
  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const { data: movies = [], isLoading: moviesLoading } = useMovies();
  const { data: shows = [], isLoading: showsLoading } = useTvShows();
  const { data: collectionListItems = {} } = useAllChecklistItems();
  const loading = collectionsLoading || moviesLoading || showsLoading;
  const [showCreateInput, setShowCreateInput] = useState(false);

  // The collection open in a drawer (?collection=name), and a movie or show opened from it in a
  // second drawer on top (?movie=id, ?show=id); Back closes the top one first
  const {
    openId: openCollectionName,
    open: openCollection,
    close: closeCollection,
    replace: replaceCollection,
  } = useDrawerParam("collection");
  const { openId: openMovieId, open: openMovie, close: closeMovie } = useDrawerParam("movie");
  const { openId: openShowId, open: openShow, close: closeShow } = useDrawerParam("show");

  const getCompletionPercentage = (
    collectionId: number,
    collectionName: string,
  ) => {
    const listItems = collectionListItems[collectionId] || [];
    if (listItems.length === 0) return null;

    // Same check as the collection's own checklist: the movie or show must be in this collection
    const owned = {
      movies: movies.filter((m) => m.collections?.includes(collectionName)),
      shows: shows.filter((s) => s.collections?.includes(collectionName)),
    };
    const ownedCount = listItems.filter((item) => isChecklistItemOwned(item, owned)).length;

    return Math.round((ownedCount / listItems.length) * 100);
  };

  if (loading) {
    return (
      <>
        <ListSkeleton viewMode="poster" toolbar={false} grid={POSTER_GRID_CAPTIONED} label="Loading collections" />
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
      // The chosen cover, or the earliest movie's (or show's) poster
      coverPath={collectionCover(collection, movies, shows)}
      onOpen={() => openCollection(collection.name)}
    />
  );
  const directorCollections = collections.filter((c) => c.isDirectorCollection);

  return (
    <>
      <PageShell remeasureWhen={loading}>
        {/* Tablet up: on phones the top bar's tabs name the page */}
        <PageHeader
          title="Collections"
          subtitle={`${collections.length} ${collections.length === 1 ? "collection" : "collections"}`}
          className="hidden shrink-0 px-4 pt-4 pb-4 md:flex md:px-20 md:pt-7"
        />

        {/* Scrolls on its own; the small top inset keeps the hover ring and lift inside it */}
        <div className="flex min-h-0 flex-1 flex-col gap-10 overflow-y-auto px-4 pt-4 md:pt-2 pb-8 md:px-20">
          <div className={POSTER_GRID_CAPTIONED}>
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
              <div className={POSTER_GRID_CAPTIONED}>{directorCollections.map(renderCard)}</div>
            </section>
          )}
        </div>
      </PageShell>

      {openCollectionName && (
        <Drawer label="Collection details" onClose={closeCollection}>
          <CollectionDetail
            key={openCollectionName}
            collectionName={openCollectionName}
            onOpenMovie={openMovie}
            onOpenShow={openShow}
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
            onDeleted={closeMovie}
          />
        </Drawer>
      )}
      {openShowId && (
        <Drawer label="TV show details" onClose={closeShow}>
          <TvShowDetail key={openShowId} showId={openShowId} onDeleted={closeShow} />
        </Drawer>
      )}
      {showCreateInput && (
        <CollectionFormModal
          movies={[...movies, ...shows]}
          existingNames={collections.map((c) => c.name)}
          onClose={() => setShowCreateInput(false)}
          onSaved={() => setShowCreateInput(false)}
        />
      )}
    </>
  );
}

export default CollectionsView;
