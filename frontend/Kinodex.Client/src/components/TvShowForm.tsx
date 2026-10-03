import { useState, useEffect, useRef } from "react";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { FaPlus } from "react-icons/fa6";
import type { TvShow, TvShowPurchase } from "../types";
import { TV_GENRE_MAP } from "../utils/tmdbApi";
import { formatSeasons } from "../utils/formatSeasons";
import {
  newPurchase,
  ownedSeasons,
  ownsEverySeason,
  purchaseKey,
  totalPaid,
} from "../utils/tvShowPurchases";
import TvShowPurchaseEditor from "./TvShowPurchaseEditor";

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
  { id: "details", label: "Show Details" },
  { id: "purchases", label: "Purchases" },
  { id: "poster", label: "Poster" },
];

const inputClass =
  "w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";

function TvShowForm({
  formId,
  formData,
  setFormData,
  onSubmit,
  onScanClick,
}: TvShowFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [validationError, setValidationError] = useState<string>("");
  const [yearInput, setYearInput] = useState<string>(formData.year.toString());
  const [tmdbInput, setTmdbInput] = useState<string>(
    formData.tmdbId?.toString() || "",
  );
  const [totalSeasonsInput, setTotalSeasonsInput] = useState<string>(
    formData.totalSeasons ? formData.totalSeasons.toString() : "",
  );

  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) {
        setGenreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const setPurchases = (purchases: TvShowPurchase[]) =>
    setFormData((prev) => ({ ...prev, purchases }));

  const updatePurchase = (index: number, purchase: TvShowPurchase) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) => (i === index ? purchase : p)),
    }));

  const removePurchase = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.filter((_, i) => i !== index),
    }));

  const allSeasons = Array.from(
    { length: formData.totalSeasons },
    (_, i) => i + 1,
  );
  const owned = ownedSeasons(formData.purchases);
  const paid = totalPaid(formData.purchases);

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
      className="flex flex-col h-full w-full"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4 mt-2 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition cursor-pointer whitespace-nowrap ${
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
        {/* Show Details */}
        {activeTab === "details" && (
          <div className="space-y-2 pb-2">
            {/* Title */}
            <div>
              <label htmlFor="title" className={labelClass}>
                Show Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Year */}
              <div>
                <label htmlFor="year" className={labelClass}>
                  Year
                </label>
                <input
                  type="text"
                  id="year"
                  value={yearInput}
                  onChange={(e) => handleYearChange(e.target.value)}
                  placeholder="First air year"
                  className={inputClass}
                />
              </div>
              {/* TMDB ID */}
              <div>
                <label htmlFor="tmdbId" className={labelClass}>
                  TMDB ID
                </label>
                <input
                  type="text"
                  id="tmdbId"
                  value={tmdbInput}
                  onChange={(e) => handleTmdbChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Genres */}
            <div ref={genreRef}>
              <label className={labelClass}>Genres</label>
              <div className="relative bg-gray-700 border border-gray-600 focus-within:border-gray-500">
                <div
                  className="flex flex-wrap items-center gap-2 px-3 py-1 min-h-10.5 cursor-pointer"
                  onClick={() => setGenreDropdownOpen((prev) => !prev)}
                >
                  {formData.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-full text-sm relative z-10"
                    >
                      {genre}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            ...formData,
                            genres: formData.genres.filter(
                              (_, i) => i !== index,
                            ),
                          });
                        }}
                        className="hover:text-red-300 transition cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {genreDropdownOpen && (
                  <ul className="absolute top-full left-0 w-full max-h-50 overflow-y-auto bg-gray-800 border border-gray-600 z-50">
                    {Object.values(TV_GENRE_MAP)
                      .filter((g) => !formData.genres.includes(g))
                      .sort()
                      .map((g) => (
                        <li
                          key={g}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              genres: [...formData.genres, g],
                            });
                            setGenreDropdownOpen(false);
                          }}
                          className="px-3 py-2 text-white text-sm hover:bg-gray-600 cursor-pointer"
                        >
                          {g}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex items-start justify-center gap-12 sm:gap-16">
              {/* Watched */}
              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Watched
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      hasWatched: !formData.hasWatched,
                    })
                  }
                  className="cursor-pointer"
                  title={formData.hasWatched ? "Watched" : "Not watched"}
                >
                  {formData.hasWatched ? (
                    <LuEye className="w-8 h-8 text-indigo-400" />
                  ) : (
                    <LuEyeClosed className="w-8 h-8 text-gray-500 hover:text-indigo-400" />
                  )}
                </button>
              </div>
              {/* Available to Stream */}
              <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Streaming
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, isOnPlex: !formData.isOnPlex })
                  }
                  className="cursor-pointer"
                  title={
                    formData.isOnPlex
                      ? "Available to stream"
                      : "Not available to stream"
                  }
                >
                  {formData.isOnPlex ? (
                    <HiSignal className="w-8 h-8 text-indigo-400" />
                  ) : (
                    <HiOutlineSignalSlash className="w-8 h-8 text-gray-500 hover:text-indigo-400" />
                  )}
                </button>
              </div>
              {/* Rating */}
              <div>
                <label className={labelClass}>Rating</label>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFullStar = formData.rating >= star;
                    const isHalfStar = formData.rating === star - 0.5;
                    return (
                      <div
                        key={star}
                        className="relative cursor-pointer group"
                        style={{ width: "32px", height: "32px" }}
                      >
                        <div
                          className="absolute left-0 top-0 w-1/2 h-full z-10"
                          onClick={() =>
                            setFormData({ ...formData, rating: star - 0.5 })
                          }
                          title={`${star - 0.5} stars`}
                        />
                        <div
                          className="absolute right-0 top-0 w-1/2 h-full z-10"
                          onClick={() =>
                            setFormData({ ...formData, rating: star })
                          }
                          title={`${star} stars`}
                        />
                        {isFullStar ? (
                          <TiStarFullOutline className="w-8 h-8 text-yellow-400 absolute top-0 left-0" />
                        ) : isHalfStar ? (
                          <TiStarHalfOutline className="w-8 h-8 text-yellow-400 absolute top-0 left-0" />
                        ) : (
                          <TiStarOutline className="w-8 h-8 text-gray-500 group-hover:text-yellow-200 absolute top-0 left-0" />
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: 0 })}
                    className="ml-2 text-xs text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Review / Notes */}
            <div>
              <label htmlFor="review" className={labelClass}>
                Review / Notes
              </label>
              <textarea
                id="review"
                value={formData.review}
                onChange={(e) =>
                  setFormData({ ...formData, review: e.target.value })
                }
                rows={4}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Purchases */}
        {activeTab === "purchases" && (
          <div className="space-y-4 pb-2">
            {/* Total Seasons */}
            <div>
              <label htmlFor="totalSeasons" className={labelClass}>
                Total Seasons
              </label>
              <input
                type="text"
                id="totalSeasons"
                value={totalSeasonsInput}
                onChange={(e) => handleTotalSeasonsChange(e.target.value)}
                placeholder="Number of seasons"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                Filled in from TMDB when you pick a show from the search.
              </p>
            </div>

            {/* Summary */}
            {formData.purchases.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-700/60 px-3 py-2 text-sm">
                <span className="text-white">
                  {ownsEverySeason(formData)
                    ? "Complete series"
                    : formData.totalSeasons > 0
                      ? `${formatSeasons(owned, formData.totalSeasons)} of ${formData.totalSeasons} seasons`
                      : formatSeasons(owned, formData.totalSeasons)}
                </span>
                <span className="text-gray-300">
                  {formData.purchases.length} purchase
                  {formData.purchases.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-mono text-green-400">
                    ${paid.toFixed(2)}
                  </span>
                </span>
              </div>
            )}

            {/* Quick start when nothing has been added yet */}
            {formData.purchases.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  How was this show bought?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={formData.totalSeasons === 0}
                    onClick={() => setPurchases([newPurchase(allSeasons)])}
                    className="px-4 py-3 text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700"
                  >
                    <p className="text-white font-medium">Complete set</p>
                    <p className="text-xs text-gray-400">
                      One price covering every season
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={formData.totalSeasons === 0}
                    onClick={() =>
                      setPurchases(allSeasons.map((s) => newPurchase([s])))
                    }
                    className="px-4 py-3 text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700"
                  >
                    <p className="text-white font-medium">Individual seasons</p>
                    <p className="text-xs text-gray-400">
                      A price for each season; remove any you don't own
                    </p>
                  </button>
                </div>
                {formData.totalSeasons === 0 && (
                  <p className="text-xs text-gray-400">
                    Enter Total Seasons to use these shortcuts.
                  </p>
                )}
              </div>
            )}

            {/* Purchases */}
            <div className="space-y-3">
              {formData.purchases.map((purchase, index) => (
                <TvShowPurchaseEditor
                  key={purchaseKey(purchase, index)}
                  purchase={purchase}
                  index={index}
                  totalSeasons={formData.totalSeasons}
                  onChange={(p) => updatePurchase(index, p)}
                  onRemove={() => removePurchase(index)}
                  onScanClick={
                    onScanClick ? () => onScanClick(index) : undefined
                  }
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setPurchases([...formData.purchases, newPurchase()])
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-500 text-gray-300 hover:text-white hover:border-gray-300 transition cursor-pointer"
            >
              <FaPlus className="w-3 h-3" /> Add purchase
            </button>
          </div>
        )}

        {/* Poster Details */}
        {activeTab === "poster" && (
          <div className="space-y-2 pb-2">
            {/* Show Poster */}
            <div className="flex gap-4 items-end">
              <div className="w-24 h-36 rounded-md bg-gray-900 shrink-0 flex items-center justify-center overflow-hidden">
                {formData.posterPath ? (
                  <img
                    src={formData.posterPath}
                    alt="Show poster preview"
                    className="w-full h-full object-contain"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <span className="text-gray-600 text-xs text-center px-1">
                    No poster
                  </span>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="posterPath" className={labelClass}>
                  Show Poster URL
                </label>
                <input
                  type="text"
                  id="posterPath"
                  value={formData.posterPath}
                  onChange={(e) =>
                    setFormData({ ...formData, posterPath: e.target.value })
                  }
                  placeholder="https://example.com/show-poster.jpg"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Product Poster */}
            <div className="flex gap-4 items-end">
              <div className="w-24 h-36 rounded-md bg-gray-900 shrink-0 flex items-center justify-center overflow-hidden">
                {formData.productPosterPath ? (
                  <img
                    src={formData.productPosterPath}
                    alt="Product image preview"
                    className="w-full h-full object-contain"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <span className="text-gray-600 text-xs text-center px-1">
                    No image
                  </span>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="productPosterPath" className={labelClass}>
                  Product Image URL
                </label>
                <input
                  type="text"
                  id="productPosterPath"
                  value={formData.productPosterPath}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productPosterPath: e.target.value,
                    })
                  }
                  placeholder="https://example.com/product-image.jpg"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

export default TvShowForm;
