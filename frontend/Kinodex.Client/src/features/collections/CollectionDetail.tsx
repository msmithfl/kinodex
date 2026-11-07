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
import type { Collection } from "../../types";

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

  // A table like the Movies and TV Shows lists or a poster grid, and the Movies or Checklist tab;
  // both remembered in this browser
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>("collectionViewMode", VIEW_MODES, "table");
  const [tab, setTab] = useStoredChoice("collectionTab", ["movies", "checklist"], "movies");

  if (moviesLoading || collectionsLoading) {
    return <DetailSkeleton label="Loading collection" />;
  }

  const collection = collections.find((c) => c.name === collectionName) ?? null;
  // The collection's movies in release order
  const movies = allMovies
    .filter((movie) => movie.collections?.includes(collectionName))
    .sort((a, b) => a.year - b.year);
  // The collection's own backdrop, or else the first movie's (in release order) that has one
  const backdropUrl =
    collection?.backdropUrl || movies.find((m) => m.backdropPath)?.backdropPath;

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
            {movies.length} {movies.length === 1 ? "movie" : "movies"}
          </p>
        </div>

        {/* The tabs, with the Table/Posters switch at the right while Movies is open */}
        <div className="flex shrink-0 items-end justify-between gap-3 border-b border-border">
          <TabsList className="w-auto border-b-0">
            <TabsTrigger value="movies">Movies</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>
          {/* Hidden on Checklist but still taking its space, so the row (and everything below it)
              doesn't move when switching tabs */}
          <ViewModeToggle value={viewMode} onChange={setViewMode} hidden={tab !== "movies"} className="mb-1.5" />
        </div>

        <TabsContent value="movies" className="flex min-h-0 flex-col">
          {movies.length === 0 ? (
            <EmptyState message="No movies in this collection yet." />
          ) : viewMode === "poster" ? (
            // The small inset keeps the posters' hover ring and lift inside the scroll area
            <div className={cn(POSTER_GRID_DRAWER, "-mx-2 -mt-2 min-h-0 content-start overflow-y-auto overscroll-contain px-2 pt-2 pb-2")}>
              {movies.map((movie) => (
                <PosterCard
                  key={movie.id}
                  title={movie.title}
                  posterPath={movie.posterPath}
                  subtitle={movie.year ? String(movie.year) : undefined}
                  formats={movie.formats}
                  rating={movie.rating}
                  to={`/library?movie=${movie.id}`}
                  onOpen={() => onOpenMovie(movie.id)}
                />
              ))}
            </div>
          ) : (
            // Its own height, shrinking and scrolling (under a header row that stays put) only
            // when the drawer runs out of room
            <SimpleMovieTable
              movies={movies}
              onOpen={onOpenMovie}
              showRating={false}
              fitWidth
              className="min-h-0 overflow-y-auto overscroll-contain"
            />
          )}
        </TabsContent>

        <TabsContent value="checklist" className="min-h-0 overflow-y-auto overscroll-contain">
          {collection && <CollectionChecklist collection={collection} ownedMovies={movies} />}
        </TabsContent>
      </Tabs>
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

      <DeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={collectionName}
        description="It's removed from all its movies, but the movies themselves aren't deleted."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default CollectionDetail;
