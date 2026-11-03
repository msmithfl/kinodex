import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteMovie, useMovie } from "./api";
import DetailHeader, { DetailSkeleton } from "../../components/DetailHeader";
import DeleteConfirm from "../../components/DeleteConfirm";
import TmdbLink from "../../components/TmdbLink";
import ImageLightbox from "../../components/ImageLightbox";
import { EditMovieModal } from "../../components/EditMovieModal";
import MovieDrawerDetails from "./MovieDrawerDetails";

interface MovieDetailProps {
  movieId: string;
  // Called after the movie is deleted (usually closes the drawer)
  onDeleted: () => void;
}

// The movie drawer's sections, shown as tabs under its header once there's more than one.
// Planned: a lending ledger and a watch log (on hold until the core features are solid).
type DrawerTab = "details";
const DRAWER_TABS: { id: DrawerTab; label: string }[] = [{ id: "details", label: "Details" }];

// A movie's details, shown in the side drawer (the only detail view; the old full page is retired
// and /movie/:id redirects to the library with this drawer open). The backdrop across the top,
// the poster overlapping it with the title, year, genres and rating beside it, then the details.
function MovieDetail({ movieId, onDeleted }: MovieDetailProps) {
  // From the shared cache: opening from a list shows the list's copy straight away
  const { data: movie, isLoading: loading } = useMovie(movieId);
  const deleteMovie = useDeleteMovie();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPosterLightbox, setShowPosterLightbox] = useState(false);
  const [showProductLightbox, setShowProductLightbox] = useState(false);
  // Which section shows under the header
  const [tab, setTab] = useState<DrawerTab>("details");

  if (loading) {
    return <DetailSkeleton label="Loading movie" />;
  }

  // Not yours, deleted, or a bad id in the URL
  if (!movie) {
    return <p className="px-6 py-16 text-center text-sm text-muted-foreground">Movie not found</p>;
  }

  const handleDeleteConfirm = () => {
    const title = movie.title;
    deleteMovie.mutate(movieId, {
      // Every list showing the movie refreshes itself
      onSuccess: () => {
        toast.success(`Deleted ${title}`);
        onDeleted();
      },
      onError: (error) => {
        console.error("Error deleting movie:", error);
        toast.error(`Couldn't delete ${title}. Please try again.`);
      },
    });
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <DetailHeader
        title={movie.title}
        backdropPath={movie.backdropPath}
        posterPath={movie.posterPath}
        onEnlargePoster={() => setShowPosterLightbox(true)}
        meta={
          <>
            <span>{movie.year || "Year not set"}</span>
            {movie.genres.map((genre) => (
              <span key={genre} className="flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <Link to={`/genres/${encodeURIComponent(genre)}`} className="hover:text-foreground hover:underline">
                  {genre}
                </Link>
              </span>
            ))}
          </>
        }
        rating={movie.rating}
        tmdb={<TmdbLink kind="movie" tmdbId={movie.tmdbId} />}
        kind="movie"
        onEdit={() => setShowModal(true)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Tabs under the header, once there's more than one section */}
      {DRAWER_TABS.length > 1 && (
        <Tabs value={tab} onValueChange={(next) => setTab(next as DrawerTab)} className="mt-6 px-5 md:px-8">
          <TabsList aria-label="Movie sections">
            {DRAWER_TABS.map(({ id, label }) => (
              <TabsTrigger key={id} value={id}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {tab === "details" && (
        <MovieDrawerDetails movie={movie} onEnlargeProductImage={() => setShowProductLightbox(true)} />
      )}

      {showModal && <EditMovieModal movieId={movieId} onClose={() => setShowModal(false)} />}

      {showProductLightbox && movie.productPosterPath && (
        <ImageLightbox
          src={movie.productPosterPath}
          alt={`${movie.title} product`}
          onClose={() => setShowProductLightbox(false)}
        />
      )}

      {showPosterLightbox && movie.posterPath && (
        <ImageLightbox src={movie.posterPath} alt={`${movie.title} poster`} onClose={() => setShowPosterLightbox(false)} />
      )}

      <DeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={movie.title}
        description="It's removed from your collection, with its purchase and shelf details. This can't be undone."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

export default MovieDetail;
