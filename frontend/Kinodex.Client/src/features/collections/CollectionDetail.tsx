import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ViewModeToggle, { VIEW_MODES, type ViewMode } from "../../components/ViewModeToggle";
import { POSTER_GRID_DRAWER } from "../../components/posterGrid";
import { useStoredChoice } from "../../utils/useStoredState";
import CollectionFormModal from "../../components/CollectionFormModal";
import DeleteConfirm from "../../components/DeleteConfirm";
import { DetailActions, DetailBackdrop, DetailSkeleton } from "../../components/DetailHeader";
import SimpleMovieTable from "../../components/SimpleMovieTable";
import PosterCard from "../../components/PosterCard";
import EmptyState from "../../components/EmptyState";
import CollectionChecklist from "./CollectionChecklist";
import { useCollections, useDeleteCollection } from "./api";
import { useMovies } from "../movies/api";
import { useTvShows } from "../tvShows/api";
import type { Collection, Movie, TvShow } from "../../types";
import { allFormats } from "../../utils/copies";

interface CollectionDetailProps {
  collectionName: string;
  // A movie or show in the collection was clicked: open it (in a drawer over this one)
  onOpenMovie: (movieId?: number) => void;
  onOpenShow: (showId?: number) => void;
  // Edited (possibly under a new name, which whatever tracks the open collection should follow)
  onSaved: (collection: Collection) => void;
  onDeleted: () => void;
}

// A collection's movies and TV shows and its checklist, shown in a drawer over the Collections page
function CollectionDetail({
  collectionName,
  onOpenMovie,
  onOpenShow,
  onSaved,
  onDeleted,
}: CollectionDetailProps) {
  // Shared with the Collections page, so opening the drawer usually needs no new requests
  const { data: allMovies = [], isLoading: moviesLoading } = useMovies();
  const { data: allShows = [], isLoading: showsLoading } = useTvShows();
  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const deleteCollection = useDeleteCollection();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // A table like the Movies and TV Shows lists or a poster grid, and the Movies or Checklist tab;
  // both remembered in this browser
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>("collectionViewMode", VIEW_MODES, "table");
  const [tab, setTab] = useStoredChoice("collectionTab", ["movies", "checklist"], "movies");

  if (moviesLoading || showsLoading || collectionsLoading) {
    return <DetailSkeleton label="Loading collection" />;
  }

  const collection = collections.find((c) => c.name === collectionName) ?? null;
  // The collection's movies and shows, each in release order
  const inCollection = <T extends Movie | TvShow>(titles: T[]) =>
    titles.filter((t) => t.collections?.includes(collectionName)).sort((a, b) => a.year - b.year);
  const movies = inCollection(allMovies);
  const shows = inCollection(allShows);
  // The collection's own backdrop, or else the first movie's (in release order) that has one, or a show's
  const backdropUrl =
    collection?.backdropUrl ||
    movies.find((m) => m.backdropPath)?.backdropPath ||
    shows.find((s) => s.backdropPath)?.backdropPath;
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  // The movies or shows as a table or posters; a group of each when the collection has shows
  const titleList = (kind: "movie" | "show", titles: Movie[] | TvShow[], grouped: boolean) =>
    viewMode === "poster" ? (
      <div className={cn(POSTER_GRID_DRAWER, grouped ? "content-start" : "-mx-2 -mt-2 min-h-0 content-start overflow-y-auto overscroll-contain px-2 pt-2 pb-2")}>
        {titles.map((title) => (
          <PosterCard
            key={title.id}
            title={title.title}
            posterPath={title.posterPath}
            subtitle={title.year ? String(title.year) : undefined}
            formats={allFormats(title.copies)}
            rating={title.rating}
            to={kind === "show" ? `/tv-shows?show=${title.id}` : `/library?movie=${title.id}`}
            onOpen={() => (kind === "show" ? onOpenShow(title.id) : onOpenMovie(title.id))}
          />
        ))}
      </div>
    ) : (
      // Its own height, shrinking and scrolling (under a header row that stays put) only when the
      // drawer runs out of room; in groups, the groups scroll together instead
      <SimpleMovieTable
        movies={titles}
        kind={kind}
        onOpen={kind === "show" ? onOpenShow : onOpenMovie}
        showRating={false}
        fitWidth
        className={grouped ? undefined : "min-h-0 overflow-y-auto overscroll-contain"}
      />
    );

  const handleDeleteConfirm = () => {
    if (!collection) return;
    deleteCollection.mutate(collection.id, {
      onSuccess: () => {
        toast.success(`Deleted ${collectionName}`);
        onDeleted();
      },
      onError: (error) => {
        console.error("Error deleting collection:", error);
        toast.error(`Couldn't delete ${collectionName}. Please try again.`);
      },
    });
  };

  return (
    // Fills the drawer without scrolling it: the header and tabs stay put and only the open tab's
    // content (the table, the posters or the checklist) scrolls
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <DetailBackdrop backdropPath={backdropUrl}>
          {collection && (
            <DetailActions
              kind="collection"
              onEdit={() => setShowEditModal(true)}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          )}
        </DetailBackdrop>
      </div>

      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next === "checklist" ? "checklist" : "movies")}
        className="relative -mt-12 min-h-0 flex-1 gap-4 px-5 pb-5 md:px-8 md:pb-8"
      >
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{collectionName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count(movies.length, "movie", "movies")}
            {shows.length > 0 && ` · ${count(shows.length, "TV show", "TV shows")}`}
          </p>
        </div>

        {/* The tabs, with the Table/Posters switch at the right while Titles is open */}
        <div className="flex shrink-0 items-end justify-between gap-3 border-b border-border">
          <TabsList className="w-auto border-b-0">
            <TabsTrigger value="movies">Titles</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>
          {/* Hidden on Checklist but still taking its space, so the row (and everything below it)
              doesn't move when switching tabs */}
          <ViewModeToggle value={viewMode} onChange={setViewMode} hidden={tab !== "movies"} className="mb-1.5" />
        </div>

        <TabsContent value="movies" className="flex min-h-0 flex-col">
          {movies.length === 0 && shows.length === 0 ? (
            <EmptyState message="Nothing in this collection yet." />
          ) : shows.length === 0 ? (
            titleList("movie", movies, false)
          ) : (
            // Movies, then TV shows, scrolling together; the small inset keeps the posters' hover
            // ring and lift inside the scroll area
            <div className="-mx-2 flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-2 pt-1 pb-2">
              {movies.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-xs font-medium text-muted-foreground">Movies</h2>
                  {titleList("movie", movies, true)}
                </section>
              )}
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-medium text-muted-foreground">TV shows</h2>
                {titleList("show", shows, true)}
              </section>
            </div>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="min-h-0 overflow-y-auto overscroll-contain">
          {collection && <CollectionChecklist collection={collection} owned={{ movies, shows }} />}
        </TabsContent>
      </Tabs>
      {showEditModal && collection && (
        <CollectionFormModal
          collection={collection}
          movies={[...allMovies, ...allShows]}
          existingNames={collections.map((c) => c.name)}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setShowEditModal(false);
            onSaved(updated);
          }}
        />
      )}

      <DeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={collectionName}
        description="It's removed from all its movies and shows, but they aren't deleted themselves."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default CollectionDetail;
