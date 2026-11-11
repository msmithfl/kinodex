import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bookmark, BookmarkPlus, Check, ChevronRight, PenLine, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoredState } from "@/utils/useStoredState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movie, MoviePreset, TMDBMovie } from "../types";
import { GENRE_MAP, useTmdb } from "../utils/tmdbApi";
import MovieForm from "./MovieForm";
import { BarcodeScanner } from "./lazyComponents";
import { MOD_KEY } from "./navigation";
import TmdbSearch from "./TmdbSearch";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";
import { useCreateMovie, useMovies } from "../features/movies/api";
import { ApiError } from "../utils/api";
import { useCollections, useCreateCollection } from "../features/collections/api";
import { useCreateShelfSection, useShelfSections } from "../features/shelfSections/api";
import { todayDate } from "../utils/dateUtils";
import { isMobile } from "../utils/isMobile";
import {
  PRESET_EXCLUDED_LABEL,
  presetFields,
  presetValues,
  toPreset,
  useMoviePresets,
  useSaveMoviePreset,
} from "../features/movies/presets";

interface AddMovieModalProps {
  onClose: () => void;
  // A barcode to start with, e.g. one scanned that isn't in the collection yet
  initialUpc?: string;
  // A title to start the TMDB search with, e.g. what was typed in the search window
  initialSearch?: string;
}

const FORM_ID = "add-movie-form";
// The preset Select's value for "no preset" (its items can't use an empty string)
const DEFAULT_PRESET = "default";

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// A blank movie, the form's starting point
const emptyMovie = (): Movie => ({
  userId: "",
  title: "",
  upcNumber: "",
  formats: [],
  collections: [],
  condition: "Like New",
  purchasePrice: 0,
  purchasedAt: todayDate(),
  hasWatched: false,
  rating: 0,
  review: "",
  year: new Date().getFullYear(),
  genres: [],
  posterPath: "",
  backdropPath: "",
  productPosterPath: "",
  tmdbId: undefined,
  hdDriveNumber: 0,
  shelfNumber: 1,
  shelfSection: "",
  isStreaming: true,
  isGift: false,
});


// A keyboard shortcut hint on a button; desktop only
function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("hidden rounded border px-1 font-sans text-[10px] leading-4 md:inline", className)}>
      {children}
    </kbd>
  );
}

// The movie being added, as TMDB (or the form) describes it: the poster, or the title on a tile
function PreviewPoster({ movie, className }: { movie: Movie; className?: string }) {
  return movie.posterPath ? (
    <img
      src={movie.posterPath}
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
      {movie.title || "No poster"}
    </div>
  );
}

export function AddMovieModal({ onClose, initialUpc = "", initialSearch = "" }: AddMovieModalProps) {
  // TMDB, through our API
  const { searchTMDB } = useTmdb();
  const navigate = useNavigate();
  const { data: movies = [] } = useMovies();
  const { data: collectionList = [] } = useCollections();
  const { data: shelfSectionList = [] } = useShelfSections();
  const createMovie = useCreateMovie();
  const createCollection = useCreateCollection();
  const createShelfSection = useCreateShelfSection();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Movie>(() => ({ ...emptyMovie(), upcNumber: initialUpc }));
  // "Save & add another", for the Ctrl/⌘+Enter shortcut
  const addAnotherRef = useRef<HTMLButtonElement>(null);

  // Presets fill the repeating fields (format, price, watched, ...) for batches of similar movies
  const { data: presets = [] } = useMoviePresets();
  const saveMoviePreset = useSaveMoviePreset();
  // The last preset picked, so the next Add Movie starts with it (remembered in this browser)
  const [presetId, setPresetId] = useStoredState<number | null>("addMoviePresetId", null, {
    parse: (saved) => (Number(saved) > 0 ? Number(saved) : undefined),
    serialize: (id) => (id ? String(id) : ""),
  });
  const preset = presets.find((p) => p.id === presetId);
  // Which preset's values the form holds; the chosen one is filled in once presets have loaded
  const [appliedPresetId, setAppliedPresetId] = useState<number | null>(null);
  if (preset?.id && appliedPresetId !== preset.id) {
    setAppliedPresetId(preset.id);
    // A UPC already in the form (scanned, or typed) stays unless the preset has one of its own
    setFormData((prev) => {
      const values = presetValues(preset);
      return { ...prev, ...values, upcNumber: values.upcNumber || prev.upcNumber };
    });
  }
  // Naming a new preset from the form's current values
  const [presetName, setPresetName] = useState<string | null>(null);
  // Remounts the TMDB search so each new movie starts with an empty search
  const [searchKey, setSearchKey] = useState(0);
  const collections = [...collectionList].sort(byName);
  const shelfSections = [...shelfSectionList].sort(byName);
  // TMDB results already in the library get an "In library" badge
  const ownedTmdbIds = new Set(movies.flatMap((m) => (m.tmdbId ? [m.tmdbId] : [])));
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [showShelfSectionInput, setShowShelfSectionInput] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [newShelfSection, setNewShelfSection] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [showScanner, setShowScanner] = useState(false);

  // A TMDB result fills in the title, year, genres and images, then shows the form
  const handleMovieSelect = (movie: TMDBMovie) => {
    const genres = movie.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean);
    const year = movie.release_date
      ? parseInt(movie.release_date.split("-")[0])
      : new Date().getFullYear();
    const posterPath = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : "";
    const backdropPath = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : "";

    setFormData((prev) => ({
      ...prev,
      title: movie.title,
      year,
      genres,
      posterPath,
      backdropPath,
      tmdbId: movie.id,
    }));
    setShowForm(true);
  };

  // Back to the search to pick a different TMDB match; the other fields are kept
  const changeMovie = () => {
    setShowForm(false);
    setSearchKey((key) => key + 1);
  };

  // Creates a collection from the form and adds this movie to it
  const addCollection = async () => {
    if (!newCollection || collections.find((c) => c.name === newCollection)) return;
    try {
      await createCollection.mutateAsync({
        name: newCollection,
        isDirectorCollection: false,
        imageUrl: null,
        backdropUrl: null,
      });
      setFormData((prev) => ({ ...prev, collections: [...prev.collections, newCollection] }));
      setNewCollection("");
      setShowCollectionInput(false);
    } catch (error) {
      console.error("Error adding collection:", error);
    }
  };

  // Creates a shelf section from the form and puts this movie on it
  const addShelfSection = async () => {
    if (!newShelfSection || shelfSections.find((s) => s.name === newShelfSection)) return;
    try {
      await createShelfSection.mutateAsync(newShelfSection);
      setFormData((prev) => ({ ...prev, shelfSection: newShelfSection }));
      setNewShelfSection("");
      setShowShelfSectionInput(false);
    } catch (error) {
      console.error("Error adding shelf section:", error);
    }
  };

  // Picking a preset fills its values; "Default" puts those fields back to the defaults
  const choosePreset = (id: number | null) => {
    setPresetId(id);
    if (!id) {
      setAppliedPresetId(null);
      setFormData((prev) => ({ ...prev, ...presetFields(emptyMovie()) }));
    }
  };

  // Saves the form's current values as a preset; a name that's already taken updates that preset
  const savePreset = async () => {
    const name = (presetName ?? "").trim();
    if (!name) return;
    const existing = presets.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setSubmitError("");
    try {
      const saved = await saveMoviePreset.mutateAsync({
        ...toPreset(formData),
        id: existing?.id,
        name: existing?.name ?? name,
      } as MoviePreset);
      setPresetName(null);
      // The form already holds its values, so it needn't be filled in again
      setAppliedPresetId(saved.id ?? null);
      choosePreset(saved.id ?? null);
      toast.success(existing ? `Updated the ${saved.name} preset` : `Saved the ${saved.name} preset`);
    } catch (error) {
      console.error("Error saving preset:", error);
      setSubmitError(
        error instanceof ApiError
          ? `Failed to save the preset (${error.status}). Please try again.`
          : "Could not reach the server. Please check your connection.",
      );
    }
  };
  const presetNameTaken = presets.some(
    (p) => p.name.toLowerCase() === (presetName ?? "").trim().toLowerCase(),
  );

  // The form passed its checks. Which footer button submitted it says whether to add another.
  const handleSubmit = (e: React.FormEvent) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    return saveMovie(submitter?.dataset.mode === "another");
  };

  // Saves the movie, then closes and shows the list, or with addAnother starts the next movie
  // (back to the TMDB search, with the preset's values filled in again)
  const saveMovie = async (addAnother: boolean) => {
    if (!formData.title.trim()) {
      setSubmitError("Movie title is required.");
      return;
    }
    setSubmitError("");
    try {
      // The server makes it the signed-in user's movie; every movie list refreshes itself
      const created = await createMovie.mutateAsync(formData);
      const openIt = () => navigate(`/library?movie=${created.id}`);
      if (addAnother) {
        toast.success(`Added ${created.title}`, {
          description: "Ready for the next movie",
          action: {
            label: "Open",
            onClick: () => {
              onClose();
              openIt();
            },
          },
        });
        setFormData({ ...emptyMovie(), ...(preset ? presetValues(preset) : {}) });
        setShowCollectionInput(false);
        setShowShelfSectionInput(false);
        setShowForm(false);
        setSearchKey((key) => key + 1);
        return;
      }
      onClose();
      navigate("/library");
      toast.success(`Added ${created.title}`, { action: { label: "Open", onClick: openIt } });
    } catch (error) {
      console.error("Error adding movie:", error);
      setSubmitError(
        error instanceof ApiError
          ? `Failed to add movie (${error.status}). Please try again.`
          : "Could not reach the server. Please check your connection.",
      );
    }
  };

  const handleScanClick = () => {
    setShowScanner(true);
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData((prev) => ({ ...prev, upcNumber: code }));
    setShowScanner(false);
  };

  const meta = [formData.year || null, formData.genres.slice(0, 2).join(", ") || null].filter(Boolean).join(" · ");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={FORM_MODAL_CLASS}
        onEscapeKeyDown={keepOpenWhileTyping}
        onKeyDown={(e) => {
          // Ctrl/⌘+Enter: Save & add another
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && showForm) {
            e.preventDefault();
            const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
            form?.requestSubmit(addAnotherRef.current);
          }
        }}
      >
        {/* Title and steps, then the preset */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-4">
          <div className="mr-auto flex min-w-0 flex-col gap-1">
            <DialogTitle>Add movie</DialogTitle>
            <ol aria-label="Steps" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li className={cn("flex items-center gap-1", !showForm && "font-medium text-foreground")}>
                {showForm && <Check className="size-3" aria-hidden="true" />}
                Search
              </li>
              <ChevronRight className="size-3" aria-hidden="true" />
              <li className={cn(showForm && "font-medium text-foreground")}>Details</li>
            </ol>
          </div>
          {/* Preset: fills the repeating fields for a batch of similar movies */}
          {presets.length > 0 && (
            <div className="flex items-center gap-2">
              <span id="preset-label" className="text-sm text-muted-foreground">
                Preset
              </span>
              <Select
                value={preset?.id ? String(preset.id) : DEFAULT_PRESET}
                onValueChange={(value) => choosePreset(value === DEFAULT_PRESET ? null : Number(value))}
              >
                <SelectTrigger size="sm" aria-labelledby="preset-label" className="w-36 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={DEFAULT_PRESET}>Default</SelectItem>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetName(presetName === null ? (preset?.name ?? "") : null)}
            aria-expanded={presetName !== null}
            aria-label="Save these values as a preset"
          >
            <BookmarkPlus />
            <span className="hidden sm:inline">Save as preset</span>
          </Button>
        </div>

        {/* Naming a preset: saves the form's current values (blank fields included) */}
        {presetName !== null && (
          <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-muted/40 px-5 py-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                savePreset();
              }}
            >
              <Input
                autoFocus
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name, e.g. Bookstore"
                aria-label="Preset name"
                className="flex-1"
              />
              <Button type="submit" disabled={!presetName.trim() || saveMoviePreset.isPending}>
                {presetNameTaken ? "Update preset" : "Save preset"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPresetName(null)}
                aria-label="Cancel saving preset"
              >
                <X />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Saves every field as it is now, blanks included, except the {PRESET_EXCLUDED_LABEL},
              which come from TMDB. A purchase date of today isn't fixed: the preset uses the day
              you add each movie.
            </p>
          </div>
        )}

        {!showForm ? (
          <TmdbSearch
            key={searchKey}
            // Only the first search starts with it, not ones after "Change" or "Save & add another"
            initialQuery={searchKey === 0 ? initialSearch : ""}
            search={searchTMDB}
            toOption={(movie: TMDBMovie) => ({
              id: movie.id,
              title: movie.title,
              date: movie.release_date,
              posterPath: movie.poster_path,
            })}
            onSelect={handleMovieSelect}
            ownedTmdbIds={ownedTmdbIds}
            placeholder="Search TMDB for a movie…"
          />
        ) : (
          <div className="flex min-h-0 flex-1 gap-7 px-5 pt-4 md:px-6 md:pt-5">
            {/* Tablet up: the movie being added, beside the form */}
            <aside className="hidden w-44 shrink-0 flex-col gap-3 md:flex">
              <PreviewPoster movie={formData} className="w-full" />
              <div className="flex flex-col gap-1">
                <span className="text-base leading-tight font-semibold">{formData.title || "Untitled"}</span>
                {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {formData.tmdbId && (
                  <Badge variant="outline" className="font-mono font-normal text-muted-foreground">
                    TMDB {formData.tmdbId}
                  </Badge>
                )}
                <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={changeMovie}>
                  {formData.tmdbId ? "Change movie" : "Search TMDB"}
                </Button>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Phones: the movie in a compact row */}
              <div className="mb-3 flex shrink-0 items-center gap-3 md:hidden">
                <PreviewPoster movie={formData} className="w-10 shrink-0 rounded-sm text-[0px]" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{formData.title || "Untitled"}</span>
                  {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
                </div>
                <Button variant="link" size="sm" className="px-0 text-xs" onClick={changeMovie}>
                  Change
                </Button>
              </div>
              {preset && (
                <div className="mb-3 flex shrink-0 items-center gap-2 rounded-md bg-primary-soft px-3 py-2 text-xs text-primary-text">
                  <Bookmark className="size-3.5 shrink-0" aria-hidden="true" />
                  Filled from the {preset.name} preset
                </div>
              )}
              <MovieForm
                id={FORM_ID}
                formData={formData}
                setFormData={setFormData}
                collections={collections}
                shelfSections={shelfSections}
                showCollectionInput={showCollectionInput}
                setShowCollectionInput={setShowCollectionInput}
                showShelfSectionInput={showShelfSectionInput}
                setShowShelfSectionInput={setShowShelfSectionInput}
                newCollection={newCollection}
                setNewCollection={setNewCollection}
                newShelfSection={newShelfSection}
                setNewShelfSection={setNewShelfSection}
                addCollection={addCollection}
                addShelfSection={addShelfSection}
                onSubmit={handleSubmit}
                onCancel={onClose}
                submitButtonText="Add to Collection"
                showScanButton={isMobile()}
                onScanClick={handleScanClick}
              />
            </div>
          </div>
        )}

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3">
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
              <>
                {/* Save comes first in the page so Enter in a field picks it; it's shown last */}
                <Button type="submit" form={FORM_ID} data-mode="save" disabled={createMovie.isPending} className="order-last">
                  Save
                  <Kbd className="border-white/30 text-white/80">↵</Kbd>
                </Button>
                <Button
                  ref={addAnotherRef}
                  type="submit"
                  form={FORM_ID}
                  data-mode="another"
                  variant="outline"
                  disabled={createMovie.isPending}
                >
                  <span className="sm:hidden">Save &amp; new</span>
                  <span className="hidden sm:inline">Save &amp; add another</span>
                  <Kbd className="border-border text-muted-foreground">{MOD_KEY}↵</Kbd>
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                <PenLine />
                Enter details manually
              </Button>
            )}
          </div>
        </div>

        {showScanner && (
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
