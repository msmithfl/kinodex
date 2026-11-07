import { useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

  // A table like the Movies and TV Shows lists, or a poster grid
  const [viewMode, setViewMode] = useState<"table" | "poster">(() => {
    try {
      return localStorage.getItem("collectionViewMode") === "poster" ? "poster" : "table";
    } catch {
      return "table";
    }
  });

  const handleViewModeChange = (mode: "table" | "poster") => {
    setViewMode(mode);
    try {
      localStorage.setItem("collectionViewMode", mode);
    } catch {
      // Storage unavailable; the choice just isn't remembered
    }
  };

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
    // Fills the drawer and scrolls within it
    <div className="h-full overflow-y-auto overscroll-contain">
      <DetailBackdrop backdropPath={backdropUrl}>
        {collection && (
          <DetailActions
            kind="collection"
            onEdit={() => setShowEditModal(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        )}
      </DetailBackdrop>

      <div className="relative -mt-12 flex flex-col gap-5 px-5 pb-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{collectionName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {movies.length} {movies.length === 1 ? "movie" : "movies"}
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(mode) => mode && handleViewModeChange(mode as "table" | "poster")}
            aria-label="View"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <Table2 />
            </ToggleGroupItem>
            <ToggleGroupItem value="poster" aria-label="Poster view">
              <LayoutGrid />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {movies.length === 0 ? (
          <EmptyState message="No movies in this collection yet." />
        ) : viewMode === "poster" ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:gap-x-4 md:gap-y-7 lg:grid-cols-5">
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
          <SimpleMovieTable movies={movies} onOpen={onOpenMovie} showRating={false} fitWidth />
        )}

        {collection && <CollectionChecklist collection={collection} ownedMovies={movies} />}
      </div>

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
