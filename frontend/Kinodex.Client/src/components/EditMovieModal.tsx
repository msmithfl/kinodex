import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Movie } from "../types";
import MovieForm from "./MovieForm";
import BarcodeScanner from "./BarcodeScanner";
import { MobileOnlyMessage } from "./MobileOnlyMessage";
import { useMovie, useUpdateMovie } from "../features/movies/api";
import { useCollections, useCreateCollection } from "../features/collections/api";
import { useCreateShelfSection, useShelfSections } from "../features/shelfSections/api";
import { FORM_MODAL_CLASS, keepOpenWhileTyping } from "./formModal";
import { isMobile } from "../utils/isMobile";

const FORM_ID = "edit-movie-form";

interface EditMovieModalProps {
  onClose: () => void;
  // The movie to edit
  movieId: string;
}

const EMPTY_MOVIE: Movie = {
  userId: "",
  title: "",
  upcNumber: "",
  formats: [],
  collections: [],
  condition: "Like New",
  purchasePrice: 0,
  purchasedAt: "",
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
  isStreaming: false,
  isGift: false,
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// Edit a movie: the same form as Add Movie, in the same window
export function EditMovieModal({ onClose, movieId }: EditMovieModalProps) {
  // From the shared cache (the drawer or list has usually loaded it already)
  const { data: movie } = useMovie(movieId);
  const { data: collectionList = [] } = useCollections();
  const { data: shelfSectionList = [] } = useShelfSections();
  const updateMovie = useUpdateMovie();
  const createCollection = useCreateCollection();
  const createShelfSection = useCreateShelfSection();

  const [formData, setFormData] = useState<Movie>(movie ?? EMPTY_MOVIE);
  // Fill the form once, when the movie arrives (if it wasn't already cached when the modal opened)
  const [filledFrom, setFilledFrom] = useState(movie !== undefined);
  if (!filledFrom && movie) {
    setFilledFrom(true);
    setFormData(movie);
  }

  const collections = [...collectionList].sort(byName);
  const shelfSections = [...shelfSectionList].sort(byName);
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [showShelfSectionInput, setShowShelfSectionInput] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [newShelfSection, setNewShelfSection] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setSubmitError("Movie title is required.");
      return;
    }
    setSubmitError("");
    try {
      // Every screen showing this movie refreshes itself; no page reload needed
      await updateMovie.mutateAsync({ ...formData, id: formData.id ?? Number(movieId) });
      onClose();
    } catch (error) {
      console.error("Error updating movie:", error);
      setSubmitError("Could not save the movie. Try again.");
    }
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData({ ...formData, upcNumber: code });
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
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          {formData.posterPath && (
            <img
              src={formData.posterPath}
              alt=""
              className="h-12 w-8 shrink-0 rounded-sm border border-border bg-muted object-cover"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="truncate">Edit {formData.title || "movie"}</DialogTitle>
            {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 md:px-6">
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
            submitButtonText="Save"
            showScanButton={true}
            onScanClick={handleScanClick}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-3">
          {submitError && (
            <p role="alert" className="text-sm text-destructive-text">
              {submitError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="mr-auto">
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} disabled={updateMovie.isPending}>
              {updateMovie.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {showScanner && (
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
        )}
        {showMobileOnlyMessage && <MobileOnlyMessage setShowMobileOnlyMessage={setShowMobileOnlyMessage} />}
      </DialogContent>
    </Dialog>
  );
}
