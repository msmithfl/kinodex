import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DrawerActionsSlotContext } from "./drawerActions";
import { Stars } from "./StarRating";

interface DetailHeaderProps {
  title: string;
  backdropPath: string;
  posterPath: string;
  onEnlargePoster: () => void;
  meta: ReactNode; // The line under the title: year · genres
  rating: number;
  tmdb: ReactNode; // The TMDB logo link
  kind: string; // "movie", "TV show": for the buttons' screen reader names
  onEdit: () => void;
  onDelete: () => void;
}

// A detail drawer's edit and delete: floating below the drawer's close button from tablet up, and
// over the top-left corner of the band they're placed in on phones
export function DetailActions({ kind, onEdit, onDelete }: Pick<DetailHeaderProps, "kind" | "onEdit" | "onDelete">) {
  const actionsSlot = useContext(DrawerActionsSlotContext);

  const editButton = (
    <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${kind}`} className="rounded-full">
      <Pencil />
    </Button>
  );
  const deleteButton = (
    <Button
      variant="ghost-destructive"
      size="icon"
      onClick={onDelete}
      aria-label={`Delete ${kind}`}
      className="rounded-full"
    >
      <Trash2 />
    </Button>
  );

  return (
    <>
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
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] left-3 flex gap-0.5 rounded-full border border-border bg-background/70 p-0.5 backdrop-blur-sm md:hidden">
        {editButton}
        {deleteButton}
      </div>
    </>
  );
}

// The band across the top of a detail drawer: the backdrop fading into the panel, or a plain band
// when there isn't one. Taller by the status bar's height (0 outside the home screen app), which it
// runs up behind.
export const DETAIL_BACKDROP_HEIGHT =
  "h-[calc(13rem+env(safe-area-inset-top))] md:h-[calc(16rem+env(safe-area-inset-top))]";
export function DetailBackdrop({ backdropPath, children }: { backdropPath?: string | null; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "relative",
        backdropPath
          ? DETAIL_BACKDROP_HEIGHT
          : "h-[calc(10rem+env(safe-area-inset-top))] bg-card md:h-[calc(8rem+env(safe-area-inset-top))]",
      )}
    >
      {backdropPath && <img src={backdropPath} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-linear-to-b from-background/10 via-background/45 to-background" />
      {children}
    </div>
  );
}

// The top of a redesigned detail drawer (movies, TV shows): the backdrop band, the poster
// overlapping it with the title, the meta line, stars and TMDB beside it, plus edit and delete
function DetailHeader({
  title,
  backdropPath,
  posterPath,
  onEnlargePoster,
  meta,
  rating,
  tmdb,
  kind,
  onEdit,
  onDelete,
}: DetailHeaderProps) {
  return (
    <>
      <DetailBackdrop backdropPath={backdropPath}>
        <DetailActions kind={kind} onEdit={onEdit} onDelete={onDelete} />
      </DetailBackdrop>

      {/* The poster, overlapping the backdrop, with the title beside it */}
      <header className="relative -mt-24 flex items-end gap-4 px-5 md:-mt-28 md:gap-6 md:px-8">
        {posterPath ? (
          // Click to see the poster large
          <button
            type="button"
            onClick={onEnlargePoster}
            className="shrink-0 cursor-zoom-in"
            aria-label={`Enlarge the ${title} poster`}
          >
            <img
              src={posterPath}
              alt={`${title} poster`}
              className="aspect-2/3 w-28 rounded-lg border border-border bg-muted object-cover shadow-2xl md:w-36"
            />
          </button>
        ) : (
          <div className="flex aspect-2/3 w-28 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground md:w-36">
            No poster
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">{meta}</div>
          <div className="flex items-center gap-3">
            <span className="flex [&_svg]:size-5" role="img" aria-label={rating ? `${rating} of 5 stars` : "Not rated"}>
              <Stars rating={rating} />
            </span>
            <span className="[&_img]:size-6">{tmdb}</span>
          </div>
        </div>
      </header>
    </>
  );
}

// Shimmering stand-ins for the backdrop, poster, title and details while a drawer loads
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label={label}>
      <Skeleton className={cn("rounded-none", DETAIL_BACKDROP_HEIGHT)} />
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

export default DetailHeader;
