import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronRight, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "../utils/api";
import { useCreateTvShow, useTvShows } from "../features/tvShows/api";
import type { TMDBTvShow, TvShow } from "../types";
import { TV_GENRE_MAP, useTmdb } from "../utils/tmdbApi";
import { isMobile } from "../utils/isMobile";
import TmdbSearch from "./TmdbSearch";
import TvShowForm from "./TvShowForm";
import { BarcodeScanner } from "./lazyComponents";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";
import { newPurchase } from "../utils/tvShowPurchases";

const FORM_ID = "add-tv-show-form";

const emptyTvShow = (): TvShow => ({
  title: "",
  hasWatched: false,
  rating: 0,
  review: "",
  year: new Date().getFullYear(),
  genres: [],
  posterPath: "",
  backdropPath: "",
  tmdbId: undefined,
  totalSeasons: 0,
  isStreaming: false,
  purchases: [],
});

interface AddTvShowModalProps {
  onClose: () => void;
  // A barcode to start with (as the first purchase), e.g. one scanned that isn't in the collection yet
  initialUpc?: string;
  // A title to start the TMDB search with, e.g. what was typed in the search window
  initialSearch?: string;
}

// The show being added: its poster, or the title on a tile
function PreviewPoster({ show, className }: { show: TvShow; className?: string }) {
  return show.posterPath ? (
    <img
      src={show.posterPath}
      alt=""
      className={cn("aspect-2/3 rounded-lg border border-border bg-muted object-cover shadow-lg", className)}
    />
  ) : (
    <div
      className={cn(
        "flex aspect-2/3 items-center justify-center rounded-lg border border-border bg-muted p-2 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      {show.title || "No poster"}
    </div>
  );
}

// Add a TV show: search TMDB, then fill in the details and purchases. Same window as Add Movie.
export function AddTvShowModal({ onClose, initialUpc = "", initialSearch = "" }: AddTvShowModalProps) {
  // TMDB, through our API
  const { getTMDBTvSeasonCount, searchTMDBTv } = useTmdb();
  const navigate = useNavigate();
  const { data: shows = [] } = useTvShows();
  // Adding refreshes every screen listing shows
  const createTvShow = useCreateTvShow();
  const saving = createTvShow.isPending;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TvShow>(() => ({
    ...emptyTvShow(),
    purchases: initialUpc ? [newPurchase([], { upcNumber: initialUpc })] : [],
  }));
  const [submitError, setSubmitError] = useState("");
  // Remounts the TMDB search when going back to it
  const [searchKey, setSearchKey] = useState(0);
  // Which purchase a barcode scan fills in; null when the scanner is closed
  const [scanPurchaseIndex, setScanPurchaseIndex] = useState<number | null>(null);
  // TMDB results already in the library get an "In library" badge
  const ownedTmdbIds = new Set(shows.flatMap((s) => (s.tmdbId ? [s.tmdbId] : [])));

  const handleShowSelect = async (show: TMDBTvShow) => {
    const genres = show.genre_ids
      .map((id) => TV_GENRE_MAP[id])
      .filter(Boolean);
    const year = show.first_air_date
      ? parseInt(show.first_air_date.split("-")[0])
      : new Date().getFullYear();

    setFormData((prev) => ({
      ...prev,
      title: show.name,
      year,
      genres,
      posterPath: show.poster_path
        ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
        : "",
      backdropPath: show.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
        : "",
      tmdbId: show.id,
      totalSeasons: 0,
    }));
    setShowForm(true);

    // Search results don't carry a season count, so fetch it once the form is open.
    // Only apply it if the user hasn't since pointed the form at a different show.
    const totalSeasons = await getTMDBTvSeasonCount(show.id);
    setFormData((prev) =>
      prev.tmdbId === show.id ? { ...prev, totalSeasons } : prev,
    );
  };

  // Back to the search to pick a different TMDB match (the Search step under the title); the other
  // fields are kept
  const changeShow = () => {
    setShowForm(false);
    setSearchKey((key) => key + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    try {
      const created = await createTvShow.mutateAsync(formData);
      onClose();
      navigate("/tv-shows");
      toast.success(`Added ${created.title}`, {
        action: { label: "Open", onClick: () => navigate(`/tv-shows?show=${created.id}`) },
      });
    } catch (error) {
      console.error("Error adding TV show:", error);
      setSubmitError(
        !(error instanceof ApiError)
          ? "Could not reach the server. Please check your connection."
          : error.status === 400
            ? error.message
            : `Failed to add TV show (${error.status}). Please try again.`,
      );
    }
  };

  const handleScanClick = (purchaseIndex: number) => {
    setScanPurchaseIndex(purchaseIndex);
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) =>
        i === scanPurchaseIndex ? { ...p, upcNumber: code } : p,
      ),
    }));
    setScanPurchaseIndex(null);
  };

  const meta = [formData.year || null, formData.genres.slice(0, 2).join(", ") || null].filter(Boolean).join(" · ");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={FORM_MODAL_CLASS}
        onEscapeKeyDown={keepOpenWhileTyping}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>Add TV show</DialogTitle>
            <ol aria-label="Steps" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li className={cn("flex items-center gap-1", !showForm && "font-medium text-foreground")}>
                {showForm ? (
                  // On Details, Search is the way back to pick a different show (the padding
                  // gives the small text a bigger tap area without moving it)
                  <button
                    type="button"
                    onClick={changeShow}
                    className="-my-1 flex cursor-pointer items-center gap-1 rounded-sm py-1 underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <Check className="size-3" aria-hidden="true" />
                    Search
                  </button>
                ) : (
                  "Search"
                )}
              </li>
              <ChevronRight className="size-3" aria-hidden="true" />
              <li className={cn(showForm && "font-medium text-foreground")}>Details</li>
            </ol>
          </div>
        </div>

        {!showForm ? (
          <TmdbSearch
            key={searchKey}
            // Only the first search starts with it, not ones after going back or "Save & add another"
            initialQuery={searchKey === 0 ? initialSearch : ""}
            search={searchTMDBTv}
            toOption={(show: TMDBTvShow) => ({
              id: show.id,
              title: show.name,
              date: show.first_air_date,
              posterPath: show.poster_path,
            })}
            onSelect={handleShowSelect}
            ownedTmdbIds={ownedTmdbIds}
            placeholder="Search TMDB for a TV show…"
          />
        ) : (
          <div className="flex min-h-0 flex-1 gap-7 px-5 pt-4 md:px-6 md:pt-5">
            {/* Tablet up: the show being added, beside the form */}
            <aside className="hidden w-44 shrink-0 flex-col gap-3 md:flex">
              <PreviewPoster show={formData} className="w-full" />
              <div className="flex flex-col gap-1">
                <span className="text-base leading-tight font-semibold">{formData.title || "Untitled"}</span>
                {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                {formData.totalSeasons > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formData.totalSeasons} season{formData.totalSeasons !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {formData.tmdbId && (
                <Badge variant="outline" className="font-mono font-normal text-muted-foreground">
                  TMDB {formData.tmdbId}
                </Badge>
              )}
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Phones: the show in a compact row */}
              <div className="mb-3 flex shrink-0 items-center gap-3 md:hidden">
                <PreviewPoster show={formData} className="w-10 shrink-0 rounded-sm text-[0px]" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{formData.title || "Untitled"}</span>
                  {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
                </div>
              </div>
              <TvShowForm
                formId={FORM_ID}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onScanClick={isMobile() ? handleScanClick : undefined}
              />
            </div>
          </div>
        )}

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {submitError && (
            <p role="alert" className="text-sm text-destructive-text">
              {submitError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="mr-auto">
              Cancel
            </Button>
            {showForm ? (
              // Submits the form so its validation runs
              <Button type="submit" form={FORM_ID} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                <PenLine />
                Enter details manually
              </Button>
            )}
          </div>
        </div>

        {scanPurchaseIndex !== null && (
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanPurchaseIndex(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
