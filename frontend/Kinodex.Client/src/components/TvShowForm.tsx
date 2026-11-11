import { useState } from "react";
import type { TvShow } from "../types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImagePicker } from "./useImagePicker";
import TvShowDetailsTab from "../features/tvShows/form/TvShowDetailsTab";
import TvShowPurchasesTab from "../features/tvShows/form/TvShowPurchasesTab";
import TvShowImagesTab from "../features/tvShows/form/TvShowImagesTab";

const MAX_SEASONS = 100;

interface TvShowFormProps {
  formId: string; // Lets a submit button outside the form (e.g. a modal footer) submit it
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onScanClick?: (purchaseIndex: number) => void;
}

type Tab = "details" | "purchases" | "poster";

const tabs: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "purchases", label: "Purchases" },
  { id: "poster", label: "Images" },
];


function TvShowForm({
  formId,
  formData,
  setFormData,
  onSubmit,
  onScanClick,
}: TvShowFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [validationError, setValidationError] = useState<string>("");
  // TMDB poster and backdrop choosers for the Images tab
  const posterPicker = useImagePicker({
    kind: "tv",
    imageType: "poster",
    tmdbId: formData.tmdbId,
    selected: formData.posterPath,
    onSelect: (posterPath) => setFormData((prev) => ({ ...prev, posterPath })),
  });
  const backdropPicker = useImagePicker({
    kind: "tv",
    imageType: "backdrop",
    tmdbId: formData.tmdbId,
    selected: formData.backdropPath,
    onSelect: (backdropPath) => setFormData((prev) => ({ ...prev, backdropPath })),
  });
  const [yearInput, setYearInput] = useState<string>(formData.year.toString());
  const [tmdbInput, setTmdbInput] = useState<string>(
    formData.tmdbId?.toString() || "",
  );
  const [totalSeasonsInput, setTotalSeasonsInput] = useState<string>(
    formData.totalSeasons ? formData.totalSeasons.toString() : "",
  );

  // The TMDB season count can arrive after the form opens, so refresh its text input when it changes
  const [syncedTotalSeasons, setSyncedTotalSeasons] = useState(
    formData.totalSeasons,
  );
  if (formData.totalSeasons !== syncedTotalSeasons) {
    setSyncedTotalSeasons(formData.totalSeasons);
    setTotalSeasonsInput(
      formData.totalSeasons ? formData.totalSeasons.toString() : "",
    );
  }

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

  const handleTotalSeasonsChange = (value: string) => {
    setTotalSeasonsInput(value);
    const num = value === "" ? 0 : parseInt(value);
    if (isNaN(num) || num < 0 || num > MAX_SEASONS) return;
    // Lowering the count drops seasons past the new last season from every purchase
    setFormData({
      ...formData,
      totalSeasons: num,
      purchases:
        num > 0
          ? formData.purchases.map((p) => ({
              ...p,
              seasons: p.seasons.filter((s) => s <= num),
            }))
          : formData.purchases,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!formData.title.trim()) {
      setValidationError("Show title is required");
      setActiveTab("details");
      return;
    }
    const yearNum = parseInt(yearInput);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setValidationError("Year must be a valid number between 1900 and 2100");
      setActiveTab("details");
      return;
    }
    const totalSeasonsNum =
      totalSeasonsInput === "" ? 0 : parseInt(totalSeasonsInput);
    if (
      isNaN(totalSeasonsNum) ||
      totalSeasonsNum < 0 ||
      totalSeasonsNum > MAX_SEASONS
    ) {
      setValidationError(
        `Total Seasons must be a number between 0 and ${MAX_SEASONS}`,
      );
      setActiveTab("purchases");
      return;
    }
    const invalidIndex = formData.purchases.findIndex(
      (p) => p.seasons.length === 0 || p.price < 0 || !p.purchasedAt,
    );
    if (invalidIndex !== -1) {
      const p = formData.purchases[invalidIndex];
      setValidationError(
        `Purchase ${invalidIndex + 1}: ${
          p.seasons.length === 0
            ? "choose at least one season"
            : p.price < 0
              ? "price can't be negative"
              : "set the purchase date"
        }`,
      );
      setActiveTab("purchases");
      return;
    }

    await onSubmit(e);
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="shrink-0">
          {tabs.map((tab) => (
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
          <TvShowDetailsTab
            formData={formData}
            setFormData={setFormData}
            yearInput={yearInput}
            onYearChange={handleYearChange}
            tmdbInput={tmdbInput}
            onTmdbChange={handleTmdbChange}
          />
        )}

        {activeTab === "purchases" && (
          <TvShowPurchasesTab
            formData={formData}
            setFormData={setFormData}
            totalSeasonsInput={totalSeasonsInput}
            onTotalSeasonsChange={handleTotalSeasonsChange}
            onScanClick={onScanClick}
          />
        )}

        {activeTab === "poster" && (
          <TvShowImagesTab
            formData={formData}
            setFormData={setFormData}
            posterPicker={posterPicker}
            backdropPicker={backdropPicker}
          />
        )}
      </div>
      </Tabs>
    </form>
  );
}

export default TvShowForm;
