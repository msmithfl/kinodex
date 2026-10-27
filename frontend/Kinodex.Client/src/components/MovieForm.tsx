import { useState } from "react";
import type { Movie } from "../types";
import { useImagePicker } from "./useImagePicker";
import { useProductImagePicker } from "./useProductImagePicker";
import MovieDetailsTab from "../features/movies/form/MovieDetailsTab";
import MoviePhysicalTab from "../features/movies/form/MoviePhysicalTab";
import MovieImagesTab from "../features/movies/form/MovieImagesTab";

type Tab = "details" | "physical" | "poster";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Movie Details" },
  { id: "physical", label: "Physical" },
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
  // or a TMDB result fills it in). Purchase price isn't a trigger, so typing "12." isn't rewritten
  // to "12" mid-keystroke; it's refreshed along with the others.
  const syncKey = `${formData.year}|${formData.shelfNumber}|${formData.hdDriveNumber}|${formData.tmdbId ?? ""}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setYearInput(formData.year.toString());
    setShelfInput(formData.shelfNumber.toString());
    setHddInput(formData.hdDriveNumber.toString());
    setTmdbInput(formData.tmdbId?.toString() || "");
    setPurchasePriceInput(formData.purchasePrice.toString());
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
      setActiveTab("physical");
      return;
    }
    if (isNaN(parseInt(hddInput))) {
      setValidationError("HDD Number must be a valid number");
      setActiveTab("physical");
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
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4 mt-2 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition cursor-pointer ${
              activeTab === tab.id
                ? "text-white border-b-2 border-indigo-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {validationError && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-md mb-4 shrink-0">
          {validationError}
        </div>
      )}

      {/* Scrollable tab content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
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
    </form>
  );
}

export default MovieForm;
