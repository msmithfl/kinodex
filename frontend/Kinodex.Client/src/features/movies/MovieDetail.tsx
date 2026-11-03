import { useState, useContext } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DrawerActionsSlotContext } from "../../components/drawerActions";
import { useDeleteMovie, useMovie } from "./api";
import { Stars } from "../../components/StarRating";
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

// Shimmering stand-ins for the backdrop, poster, title and details while the movie loads
function MovieDetailSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading movie">
      <Skeleton className="h-52 rounded-none md:h-64" />
      <div className="-mt-24 flex items-end gap-4 px-5 md:-mt-28 md:gap-6 md:px-8">
        <Skeleton className="aspect-2/3 w-28 rounded-lg md:w-36" />
        <div className="flex flex-1 flex-col gap-2 pb-1">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 pt-6 md:px-8">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  );
}

// A movie's details, shown in the side drawer (the only detail view; the old full page is retired
// and /movie/:id redirects to the library with this drawer open). The backdrop across the top,
// the poster overlapping it with the title, year, genres and rating beside it, then the details.
function MovieDetail({ movieId, onDeleted }: MovieDetailProps) {
  // From tablet up the drawer floats edit and delete beside its close button, outside the panel
  const actionsSlot = useContext(DrawerActionsSlotContext);
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
    return <MovieDetailSkeleton />;
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

  const hasBackdrop = Boolean(movie.backdropPath);

  // Edit and delete: over the backdrop on phones, beside the drawer's close button from tablet up
  const editButton = (
    <Button variant="ghost" size="icon" onClick={() => setShowModal(true)} aria-label="Edit movie" className="rounded-full">
      <Pencil />
    </Button>
  );
  const deleteButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setShowDeleteConfirm(true)}
      aria-label="Delete movie"
      className="rounded-full text-red-300 hover:bg-destructive/15 hover:text-red-200"
    >
      <Trash2 />
    </Button>
  );

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      {/* From tablet up: edit and delete float below the close button, outside the panel */}
      {actionsSlot &&
        createPortal(
          <div className="flex flex-col gap-1 rounded-full border border-border bg-popover/90 p-1 shadow-lg backdrop-blur-sm">
            <Tooltip>
              <TooltipTrigger asChild>{editButton}</TooltipTrigger>
              <TooltipContent side="left">Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>{deleteButton}</TooltipTrigger>
              <TooltipContent side="left">Delete</TooltipContent>
            </Tooltip>
          </div>,
          actionsSlot,
        )}

      {/* The backdrop, fading into the panel; a plain band when there isn't one */}
      <div className={cn("relative", hasBackdrop ? "h-52 md:h-64" : "h-40 bg-card md:h-32")}>
        {hasBackdrop && (
          <img src={movie.backdropPath} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-background/10 via-background/45 to-background" />
        {/* Phones: edit and delete over the top-left corner */}
        <div className="absolute top-3 left-3 flex gap-0.5 rounded-full border border-white/10 bg-background/70 p-0.5 backdrop-blur-sm md:hidden">
          {editButton}
          {deleteButton}
        </div>
      </div>

      {/* The poster, overlapping the backdrop, with the title beside it */}
      <header className="relative -mt-24 flex items-end gap-4 px-5 md:-mt-28 md:gap-6 md:px-8">
        {movie.posterPath ? (
          // Click to see the poster large
          <button
            type="button"
            onClick={() => setShowPosterLightbox(true)}
            className="shrink-0 cursor-zoom-in"
            aria-label={`Enlarge the ${movie.title} poster`}
          >
            <img
              src={movie.posterPath}
              alt={`${movie.title} poster`}
              className="aspect-2/3 w-28 rounded-lg border border-white/10 bg-muted object-cover shadow-2xl md:w-36"
            />
          </button>
        ) : (
          <div className="flex aspect-2/3 w-28 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground md:w-36">
            No poster
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{movie.title}</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <span>{movie.year || "Year not set"}</span>
            {movie.genres.map((genre) => (
              <span key={genre} className="flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <Link to={`/genres/${encodeURIComponent(genre)}`} className="hover:text-foreground hover:underline">
                  {genre}
                </Link>
              </span>
            ))}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex [&_svg]:size-5" role="img" aria-label={movie.rating ? `${movie.rating} of 5 stars` : "Not rated"}>
              <Stars rating={movie.rating} />
            </span>
            <span className="[&_img]:size-6">
              <TmdbLink kind="movie" tmdbId={movie.tmdbId} />
            </span>
          </div>
        </div>
      </header>

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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {movie.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              It's removed from your collection, with its purchase and shelf details. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MovieDetail;
