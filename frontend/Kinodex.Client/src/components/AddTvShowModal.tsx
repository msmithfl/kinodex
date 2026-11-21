import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronRight, CopyPlus, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "../utils/api";
import { useCreateTvShow, useTvShows, useUpdateTvShow } from "../features/tvShows/api";
import type { TMDBTvShow, TvShow } from "../types";
import { TV_GENRE_MAP, useTmdb } from "../utils/tmdbApi";
import { isMobile } from "../utils/isMobile";
import TmdbSearch from "./TmdbSearch";
import AlreadyOwned from "./AlreadyOwned";
import TvShowForm from "./TvShowForm";
import { BarcodeScanner } from "./lazyComponents";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";
import { newCopy, withNewCopy } from "../utils/copies";
import { useLinkToJellyfin } from "../features/jellyfin/api";

const FORM_ID = "add-tv-show-form";

const emptyTvShow = (): TvShow => ({
  title: "",
  hasWatched: false,
  rating: 0,
  review: "",
  year: new Date().getFullYear(),
  genres: [],
  collections: [],
  posterPath: "",
  backdropPath: "",
  tmdbId: undefined,
  totalSeasons: 0,
  isStreaming: false,
  copies: [],
});

interface AddTvShowModalProps {
  onClose: () => void;
  // A barcode to start with (as the first copy), e.g. one scanned that isn't in the collection yet
  initialUpc?: string;
  // A title to start the TMDB search with, e.g. what was typed in the search window
  initialSearch?: string;
  // A show already in the library to add a copy to straight away (e.g. a scanned barcode it
  // already has a copy of), with initialUpc on the new copy
  copyOfId?: number;
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

// Add a TV show: search TMDB, then fill in the details and copies. Same window as Add Movie.
export function AddTvShowModal({ onClose, initialUpc = "", initialSearch = "", copyOfId }: AddTvShowModalProps) {
  // TMDB, through our API
  const { getTMDBTvSeasonCount, searchTMDBTv } = useTmdb();
  const navigate = useNavigate();
  const { data: shows = [] } = useTvShows();
  // Adding refreshes every screen listing shows
  const createTvShow = useCreateTvShow();
  const updateTvShow = useUpdateTvShow();
  const linkToJellyfin = useLinkToJellyfin();
  const saving = createTvShow.isPending || updateTvShow.isPending;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TvShow>(() => ({
    ...emptyTvShow(),
    copies: initialUpc ? [newCopy({ upcNumber: initialUpc })] : [],
  }));
  const [submitError, setSubmitError] = useState("");
  // Remounts the TMDB search when going back to it
  const [searchKey, setSearchKey] = useState(0);
  // Which copy a barcode scan fills in; null when the scanner is closed
  const [scanCopyIndex, setScanCopyIndex] = useState<number | null>(null);
  // TMDB results already in the library get an "In library" badge
  const ownedTmdbIds = new Set(shows.flatMap((s) => (s.tmdbId ? [s.tmdbId] : [])));

  // A show already in the library this window is adding a copy to, rather than adding a new show
  // (docs/design/titles-and-copies.md), and the new copy's form key; null when adding a show
  const [copyOf, setCopyOf] = useState<TvShow | null>(null);
  const [newCopyKey, setNewCopyKey] = useState<string | null>(null);
  // A search result that's already in the library, waiting for "add a copy" or "add as new"
  const [ownedPick, setOwnedPick] = useState<{ tmdb: TMDBTvShow; show: TvShow } | null>(null);

  // Starts adding a copy to a show already owned: the form shows it with a new copy at the end
  // (with the scanned UPC; its seasons still to pick), opening on that copy
  const startCopy = (show: TvShow, upc: string) => {
    const copy = newCopy({ upcNumber: upc });
    setCopyOf(show);
    setNewCopyKey(copy.clientKey ?? null);
    setFormData(withNewCopy(show, copy));
    setOwnedPick(null);
    setShowForm(true);
  };

  // Handed a show to add a copy to (a scan of a barcode it already has): start straight away,
  // once the shows have loaded
  const [startedCopyOf, setStartedCopyOf] = useState(false);
  if (copyOfId && !startedCopyOf) {
    const show = shows.find((s) => s.id === copyOfId);
    if (show) {
      setStartedCopyOf(true);
      startCopy(show, initialUpc);
    }
  }

  // A TMDB result already in the library asks first: add a copy to it, or add it as a new show
  const handleShowSelect = (show: TMDBTvShow) => {
    const owned = shows.find((s) => s.tmdbId === show.id);
    if (owned) setOwnedPick({ tmdb: show, show: owned });
    else void fillFromTmdb(show);
  };

  // A TMDB result fills in the title, year, genres and images, then shows the form
  const fillFromTmdb = async (show: TMDBTvShow) => {
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
    // Back to adding a new show, keeping what was filled in for the copy being added
    if (copyOf) {
      const copy = formData.copies.find((c) => c.clientKey === newCopyKey);
      setFormData({ ...emptyTvShow(), copies: copy ? [copy] : [] });
      setCopyOf(null);
      setNewCopyKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (copyOf) return saveCopy();
    try {
      const created = await createTvShow.mutateAsync(formData);
      // If it's already on Jellyfin, link it (in the background)
      void linkToJellyfin("show", created.id!);
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

  // Saves a show already owned with its new copy
  const saveCopy = async () => {
    try {
      const saved = await updateTvShow.mutateAsync({ ...formData, id: copyOf!.id });
      onClose();
      navigate("/tv-shows");
      toast.success(`Added a copy of ${saved.title}`, {
        action: { label: "Open", onClick: () => navigate(`/tv-shows?show=${saved.id}`) },
      });
    } catch (error) {
      console.error("Error adding a copy:", error);
      setSubmitError(
        !(error instanceof ApiError)
          ? "Could not reach the server. Please check your connection."
          : error.status === 400
            ? error.message
            : `Failed to add the copy (${error.status}). Please try again.`,
      );
    }
  };

  const handleScanClick = (copyIndex: number) => {
    setScanCopyIndex(copyIndex);
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      copies: prev.copies.map((p, i) =>
        i === scanCopyIndex ? { ...p, upcNumber: code } : p,
      ),
    }));
    setScanCopyIndex(null);
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
            <DialogTitle>{copyOf ? "Add a copy" : "Add TV show"}</DialogTitle>
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

        {!showForm && ownedPick && (
          <AlreadyOwned
            kind="show"
            title={ownedPick.show.title}
            year={ownedPick.show.year}
            posterPath={ownedPick.show.posterPath}
            copies={ownedPick.show.copies}
            totalSeasons={ownedPick.show.totalSeasons}
            onAddCopy={() => startCopy(ownedPick.show, formData.copies[0]?.upcNumber ?? "")}
            onAddNew={() => {
              void fillFromTmdb(ownedPick.tmdb);
              setOwnedPick(null);
            }}
            onBack={() => setOwnedPick(null)}
          />
        )}
        {!showForm ? (
          <TmdbSearch
            key={searchKey}
            // Kept (hidden) while asking about a pick already owned, so going back keeps the search
            hidden={ownedPick !== null}
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
              {copyOf && (
                <div className="mb-3 flex shrink-0 items-center gap-2 rounded-md bg-primary-soft px-3 py-2 text-xs text-primary-text">
                  <CopyPlus className="size-3.5 shrink-0" aria-hidden="true" />
                  A new copy of {copyOf.title}, after the ones you have: pick its seasons
                </div>
              )}
              <TvShowForm
                formId={FORM_ID}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onScanClick={isMobile() ? handleScanClick : undefined}
                focusCopyKey={newCopyKey ?? undefined}
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
              <Button
                variant="outline"
                onClick={() => {
                  setOwnedPick(null);
                  setShowForm(true);
                }}
              >
                <PenLine />
                Enter details manually
              </Button>
            )}
          </div>
        </div>

        {scanCopyIndex !== null && (
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanCopyIndex(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
