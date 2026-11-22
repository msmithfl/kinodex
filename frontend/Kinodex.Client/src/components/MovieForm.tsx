import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Copy, Movie } from "../types";
import { useImagePicker } from "./useImagePicker";
import CopiesTab from "./CopiesTab";
import MovieDetailsTab from "../features/movies/form/MovieDetailsTab";
import MovieImagesTab from "../features/movies/form/MovieImagesTab";
import MovieReviewTab from "../features/movies/form/MovieReviewTab";
import { useShelfSectionChoices } from "../features/shelfSections/api";

type Tab = "details" | "copies" | "poster" | "review";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "copies", label: "Copies" },
  { id: "poster", label: "Images" },
  { id: "review", label: "Review" },
];

interface MovieFormProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  // Scanning a barcode into one copy's UPC
  onScanClick?: (copyIndex: number) => void;
  // The form element's id, so buttons outside it (the modal footer) can submit it
  id?: string;
}

function MovieForm({
  formData,
  setFormData,
  onSubmit,
  onScanClick,
  id,
}: MovieFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [validationError, setValidationError] = useState<string>("");
  // Shelf sections for each copy's "where it lives"
  const shelfSections = useShelfSectionChoices();
  // TMDB poster and backdrop choosers for the Images tab
  const posterPicker = useImagePicker({
    kind: "movie",
    imageType: "poster",
    tmdbId: formData.tmdbId,
    selected: formData.posterPath,
    onSelect: (posterPath) => setFormData((prev) => ({ ...prev, posterPath })),
  });
  const backdropPicker = useImagePicker({
    kind: "movie",
    imageType: "backdrop",
    tmdbId: formData.tmdbId,
    selected: formData.backdropPath,
    onSelect: (backdropPath) => setFormData((prev) => ({ ...prev, backdropPath })),
  });
  const [yearInput, setYearInput] = useState<string>(formData.year.toString());
  const [tmdbInput, setTmdbInput] = useState<string>(formData.tmdbId?.toString() || "");

  // Keep the number text boxes in step when the movie data changes from outside them (it loads,
  // or a TMDB result or a preset fills it in)
  const syncKey = `${formData.year}|${formData.tmdbId ?? ""}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setYearInput(formData.year.toString());
    setTmdbInput(formData.tmdbId?.toString() || "");
  }

  const setCopies = (update: (copies: Copy[]) => Copy[]) =>
    setFormData((prev) => ({ ...prev, copies: update(prev.copies) }));

  const handleYearChange = (value: string) => {
    setYearInput(value);
    const num = parseInt(value);
    if (!isNaN(num)) setFormData({ ...formData, year: num });
  };

  const handleTmdbChange = (value: string) => {
    setTmdbInput(value);
    if (value === "") {
      setFormData({ ...formData, tmdbId: undefined });
    } else {
      const num = parseInt(value);
      if (!isNaN(num)) setFormData({ ...formData, tmdbId: num });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const yearNum = parseInt(yearInput);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setValidationError("Year must be a valid number between 1900 and 2100");
      setActiveTab("details");
      return;
    }
    const invalidIndex = formData.copies.findIndex((c) => c.price < 0 || !c.purchasedAt);
    if (invalidIndex !== -1) {
      const copy = formData.copies[invalidIndex];
      setValidationError(`Copy ${invalidIndex + 1}: ${copy.price < 0 ? "price can't be negative" : "set the purchase date"}`);
      setActiveTab("copies");
      return;
    }

    await onSubmit(e);
  };

  return (
    <form id={id} onSubmit={handleSubmit} className="flex min-h-0 w-full flex-1 flex-col">
      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="shrink-0">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {validationError && (
          <div role="alert" className="mt-4 shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-text">
            {validationError}
          </div>
        )}

        {/* Scrollable tab content */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pt-4">
        {activeTab === "details" && (
          <MovieDetailsTab
            formData={formData}
            setFormData={setFormData}
            yearInput={yearInput}
            onYearChange={handleYearChange}
            tmdbInput={tmdbInput}
            onTmdbChange={handleTmdbChange}
          />
        )}

        {activeTab === "copies" && (
          <CopiesTab
            copies={formData.copies}
            setCopies={setCopies}
            shelfSections={shelfSections.names}
            onAddShelfSection={shelfSections.add}
            onScanClick={onScanClick}
          />
        )}

        {activeTab === "poster" && (
          <MovieImagesTab
            formData={formData}
            setFormData={setFormData}
            posterPicker={posterPicker}
            backdropPicker={backdropPicker}
          />
        )}

        {activeTab === "review" && <MovieReviewTab formData={formData} setFormData={setFormData} />}
        </div>
      </Tabs>
    </form>
  );
}

export default MovieForm;
