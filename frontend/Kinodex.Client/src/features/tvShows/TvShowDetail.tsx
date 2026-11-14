import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "../../utils/api";
import { useDeleteTvShow, useTvShow } from "./api";
import DetailHeader, { DetailSkeleton } from "../../components/DetailHeader";
import DeleteConfirm from "../../components/DeleteConfirm";
import TmdbLink from "../../components/TmdbLink";
import ImageLightbox from "../../components/ImageLightbox";
import { EditTvShowModal } from "../../components/EditTvShowModal";
import TvShowDrawerDetails from "./TvShowDrawerDetails";

interface TvShowDetailProps {
  showId: string;
  // Called after the show is deleted (usually closes the drawer)
  onDeleted: () => void;
}

// A TV show's details, shown in the side drawer (the only detail view; the old full page is
// retired and /tv-shows/:id redirects to the list with this drawer open). The backdrop across the
// top, the poster overlapping it with the title, year, genres and rating beside it, then the
// seasons, purchases and the rest.
function TvShowDetail({ showId, onDeleted }: TvShowDetailProps) {
  // From the shared cache: opening from the list shows the list's copy straight away
  const { data: show, isLoading: loading, error } = useTvShow(showId);
  const deleteTvShow = useDeleteTvShow();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  // The product image being shown large (each purchase has its own)
  const [productLightboxSrc, setProductLightboxSrc] = useState<string | null>(null);

  if (loading) {
    return <DetailSkeleton label="Loading TV show" />;
  }

  if (!show) {
    const loadError = !error
      ? "TV show not found"
      : error instanceof ApiError && error.status === 404
        ? "TV show not found"
        : error instanceof ApiError
          ? `Could not load this TV show (${error.status}).`
          : "Could not reach the server to load this TV show.";
    return <p className="px-6 py-16 text-center text-sm text-muted-foreground">{loadError}</p>;
  }

  const handleDeleteConfirm = async () => {
    const title = show.title;
    try {
      // Every screen listing shows refreshes itself
      await deleteTvShow.mutateAsync(showId);
      toast.success(`Deleted ${title}`);
      onDeleted();
    } catch (error) {
      console.error("Error deleting TV show:", error);
      toast.error(
        error instanceof ApiError
          ? `Couldn't delete ${title} (${error.status}). Please try again.`
          : "Could not reach the server. Please check your connection.",
      );
    }
  };

  return (
    // From the home screen it doesn't rubber-band either (standalone:overscroll-none), which
    // would pull the backdrop away from the top of the screen
    <div className="h-full overflow-y-auto overscroll-contain standalone:overscroll-none">
      <DetailHeader
        title={show.title}
        backdropPath={show.backdropPath}
        posterPath={show.posterPath}
        onEnlargePoster={() => setShowPosterLightbox(true)}
        meta={
          <>
            <span>{show.year || "Year not set"}</span>
            {show.genres.map((genre) => (
              <span key={genre} className="flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                {genre}
              </span>
            ))}
          </>
        }
        rating={show.rating}
        tmdb={<TmdbLink kind="tv" tmdbId={show.tmdbId} />}
        kind="TV show"
        onEdit={() => setShowEditModal(true)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <TvShowDrawerDetails show={show} onEnlargeProductImage={setProductLightboxSrc} />

      {productLightboxSrc && (
        <ImageLightbox
          src={productLightboxSrc}
          alt={`${show.title} product`}
          onClose={() => setProductLightboxSrc(null)}
        />
      )}

      {showPosterLightbox && show.posterPath && (
        <ImageLightbox src={show.posterPath} alt={`${show.title} poster`} onClose={() => setShowPosterLightbox(false)} />
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

      <DeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={show.title}
        description="It's removed from your collection, with all its purchases. This can't be undone."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default TvShowDetail;
