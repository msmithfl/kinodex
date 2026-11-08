import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Movie } from "../types";
import { useImagePicker } from "./useImagePicker";
import { useProductImagePicker } from "./useProductImagePicker";
import MovieDetailsTab from "../features/movies/form/MovieDetailsTab";
import MoviePhysicalTab from "../features/movies/form/MoviePhysicalTab";
import MovieLocationTab from "../features/movies/form/MovieLocationTab";
import MovieImagesTab from "../features/movies/form/MovieImagesTab";

type Tab = "details" | "physical" | "location" | "poster";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "physical", label: "Physical" },
  { id: "location", label: "Location" },
  { id: "poster", label: "Images" },
];

interface MovieFormProps {
  formData: Movie;
  setFormData: React.Dispatch<React.SetStateAction<Movie>>;
  collections: { id: number; name: string }[];
  shelfSections: { id: number; name: string }[];
  showCollectionInput: boolean;
  setShowCollectionInput: React.Dispatch<React.SetStateAction<boolean>>;
  showShelfSectionInput: boolean;
  setShowShelfSectionInput: React.Dispatch<React.SetStateAction<boolean>>;
  newCollection: string;
  setNewCollection: React.Dispatch<React.SetStateAction<string>>;
  newShelfSection: string;
  setNewShelfSection: React.Dispatch<React.SetStateAction<string>>;
  addCollection: () => Promise<void>;
  addShelfSection: () => Promise<void>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  showScanButton?: boolean;
  onScanClick?: () => void;
  // The form element's id, so buttons outside it (the modal footer) can submit it
  id?: string;
}

function MovieForm({
  formData,
  setFormData,
  collections,
  shelfSections,
  showCollectionInput,
  setShowCollectionInput,
  showShelfSectionInput,
  setShowShelfSectionInput,
  newCollection,
  setNewCollection,
  newShelfSection,
  setNewShelfSection,
  addCollection,
  addShelfSection,
  onSubmit,
  showScanButton = false,
  onScanClick,
  id,
}: MovieFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [validationError, setValidationError] = useState<string>("");
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
  // Product (box art) images found by the movie's UPC
  const productPicker = useProductImagePicker({
    upc: formData.upcNumber,
    selected: formData.productPosterPath,
    onSelect: (productPosterPath) => setFormData((prev) => ({ ...prev, productPosterPath })),
  });
  const [yearInput, setYearInput] = useState<string>(formData.year.toString());
  const [shelfInput, setShelfInput] = useState<string>(
    formData.shelfNumber.toString(),
  );
  const [hddInput, setHddInput] = useState<string>(
    formData.hdDriveNumber.toString(),
  );
  const [tmdbInput, setTmdbInput] = useState<string>(
    formData.tmdbId?.toString() || "",
  );
  const [purchasePriceInput, setPurchasePriceInput] = useState<string>(
    formData.purchasePrice.toString(),
  );

  // Keep the number text boxes in step when the movie data changes from outside them (it loads,
  // a TMDB result or a preset fills it in). The price text is only rewritten when it no longer
  // means the price, so typing "12." isn't rewritten to "12" mid-keystroke.
  const syncKey = `${formData.year}|${formData.shelfNumber}|${formData.hdDriveNumber}|${formData.tmdbId ?? ""}|${formData.purchasePrice}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setYearInput(formData.year.toString());
    setShelfInput(formData.shelfNumber.toString());
    setHddInput(formData.hdDriveNumber.toString());
    setTmdbInput(formData.tmdbId?.toString() || "");
    if (parseFloat(purchasePriceInput) !== formData.purchasePrice) {
      setPurchasePriceInput(formData.purchasePrice.toString());
    }
  }

  const handleYearChange = (value: string) => {
    setYearInput(value);
    const num = parseInt(value);
    if (!isNaN(num)) setFormData({ ...formData, year: num });
  };

  const handleShelfChange = (value: string) => {
    setShelfInput(value);
    const num = parseInt(value);
    if (!isNaN(num)) setFormData({ ...formData, shelfNumber: num });
  };

  const handleHddChange = (value: string) => {
    setHddInput(value);
    const num = parseInt(value);
    if (!isNaN(num)) setFormData({ ...formData, hdDriveNumber: num });
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

  const handlePurchasePriceChange = (value: string) => {
    setPurchasePriceInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) setFormData({ ...formData, purchasePrice: num });
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
    if (isNaN(parseInt(shelfInput))) {
      setValidationError("Shelf Number must be a valid number");
      setActiveTab("location");
      return;
    }
    if (isNaN(parseInt(hddInput))) {
      setValidationError("HDD Number must be a valid number");
      setActiveTab("location");
      return;
    }
    if (isNaN(parseFloat(purchasePriceInput))) {
      setValidationError("Purchase Price must be a valid number");
      setActiveTab("physical");
      return;
    }
    if (!formData.purchasedAt) {
      setValidationError("Purchase Date is required");
      setActiveTab("physical");
      return;
    }

    await onSubmit(e);
  };


  return (
    <form id={id} onSubmit={handleSubmit} className="flex flex-col h-full w-full">
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
            collections={collections}
            showCollectionInput={showCollectionInput}
            setShowCollectionInput={setShowCollectionInput}
            newCollection={newCollection}
            setNewCollection={setNewCollection}
            addCollection={addCollection}
          />
        )}

        {activeTab === "physical" && (
          <MoviePhysicalTab
            formData={formData}
            setFormData={setFormData}
            showScanButton={showScanButton}
            onScanClick={onScanClick}
            purchasePriceInput={purchasePriceInput}
            onPurchasePriceChange={handlePurchasePriceChange}
          />
        )}

        {activeTab === "location" && (
          <MovieLocationTab
            formData={formData}
            setFormData={setFormData}
            shelfInput={shelfInput}
            onShelfChange={handleShelfChange}
            hddInput={hddInput}
            onHddChange={handleHddChange}
            shelfSections={shelfSections}
            showShelfSectionInput={showShelfSectionInput}
            setShowShelfSectionInput={setShowShelfSectionInput}
            newShelfSection={newShelfSection}
            setNewShelfSection={setNewShelfSection}
            addShelfSection={addShelfSection}
          />
        )}

        {activeTab === "poster" && (
          <MovieImagesTab
            formData={formData}
            setFormData={setFormData}
            posterPicker={posterPicker}
            backdropPicker={backdropPicker}
            productPicker={productPicker}
          />
        )}
        </div>
      </Tabs>
    </form>
  );
}

export default MovieForm;
