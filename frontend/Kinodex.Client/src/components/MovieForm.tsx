import { useState, useEffect, useRef } from "react";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { IoCameraOutline } from "react-icons/io5";
import { Genres, type Movie } from "../types";

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
  onManualSearchClick?: () => void;
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
  // onCancel,
  // submitButtonText = "Save",
  showScanButton = false,
  onScanClick,
}: MovieFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [validationError, setValidationError] = useState<string>("");
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

  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreRef = useRef<HTMLDivElement>(null);
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const formatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) {
        setGenreDropdownOpen(false);
      }
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
        setFormatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setYearInput(formData.year.toString());
    setShelfInput(formData.shelfNumber.toString());
    setHddInput(formData.hdDriveNumber.toString());
    setTmdbInput(formData.tmdbId?.toString() || "");
    setPurchasePriceInput(formData.purchasePrice.toString());
  }, [
    formData.year,
    formData.shelfNumber,
    formData.hdDriveNumber,
    formData.tmdbId,
  ]);

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

    await onSubmit(e);
  };

  type Tab = "details" | "physical" | "poster";

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Movie Details" },
    { id: "physical", label: "Physical" },
    { id: "poster", label: "Poster" },
  ];

  const inputClass =
    "w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500";
  const labelClass = "block text-sm font-medium text-gray-300 mb-2";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4 mt-2 shrink-0">
        {tabs.map((tab) => (
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
        {/* Movie Details */}
        {activeTab === "details" && (
          <div className="space-y-2 pb-2">
            {/* Title */}
            <div>
              <label htmlFor="title" className={labelClass}>
                Movie Title *
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
                  placeholder="Release year"
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
                  {formData.genres.length === 0 && (
                    <span className="text-gray-400 text-sm"></span>
                  )}
                </div>

                {/* Custom dropdown */}
                {genreDropdownOpen && (
                  <ul className="absolute top-full left-0 w-full max-h-50 overflow-y-auto bg-gray-800 border border-gray-600 z-50">
                    {Object.values(Genres)
                      .filter((g) => !formData.genres.includes(g))
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

            {/* Collections */}
            <div>
              <label className={labelClass}>Collections</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {formData.collections.map((col, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-full text-sm"
                  >
                    {col}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          collections: formData.collections.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                      className="hover:text-red-300 transition cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      !formData.collections.includes(e.target.value)
                    )
                      setFormData({
                        ...formData,
                        collections: [...formData.collections, e.target.value],
                      });
                  }}
                  className={inputClass + " cursor-pointer flex-1"}
                >
                  <option value="">Add collection...</option>
                  {collections
                    .filter((col) => !formData.collections.includes(col.name))
                    .map((col) => (
                      <option key={col.id} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCollectionInput(!showCollectionInput)}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
                >
                  +
                </button>
              </div>
              {showCollectionInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newCollection}
                    onChange={(e) => setNewCollection(e.target.value)}
                    placeholder="New collection name"
                    className={inputClass + " flex-1"}
                  />
                  <button
                    type="button"
                    onClick={addCollection}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start justify-center gap-16">
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
                {/* <p className="text-xs text-gray-400 mt-1">
                  {formData.rating > 0
                    ? `${formData.rating} stars`
                    : "Not rated"}
                </p> */}
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

        {/* Physical Details */}
        {activeTab === "physical" && (
          <div className="space-y-2 pb-2">
            {/* UPC */}
            <div>
              <label htmlFor="upc" className={labelClass}>
                UPC Number *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="upc"
                  value={formData.upcNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, upcNumber: e.target.value })
                  }
                  required
                  placeholder="Enter UPC barcode number"
                  className={inputClass + " flex-1"}
                />
                {showScanButton && onScanClick && (
                  <button
                    type="button"
                    onClick={onScanClick}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
                    title="Scan barcode"
                  >
                    <IoCameraOutline className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Formats */}
            <div ref={formatRef}>
              <label className={labelClass}>Formats *</label>
              <div className="relative bg-gray-700 border border-gray-600 focus-within:border-gray-500">
                <div
                  className="flex flex-wrap items-center gap-2 px-3 py-2 min-h-10.5 cursor-pointer"
                  onClick={() => setFormatDropdownOpen((prev) => !prev)}
                >
                  {formData.formats.map((fmt, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-full text-sm relative z-10"
                    >
                      {fmt}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            ...formData,
                            formats: formData.formats.filter(
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
                  {formData.formats.length === 0 && (
                    <span className="text-gray-400 text-sm">Add format...</span>
                  )}
                </div>

                {formatDropdownOpen && (
                  <ul className="absolute top-full left-0 w-full max-h-30 overflow-y-auto bg-gray-800 border border-gray-600 z-50">
                    {(["4K", "Blu-ray", "DVD", "VHS"] as const)
                      .filter((f) => !formData.formats.includes(f))
                      .map((f) => (
                        <li
                          key={f}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              formats: [...formData.formats, f],
                            });
                            setFormatDropdownOpen(false);
                          }}
                          className="px-3 py-2 text-white text-sm hover:bg-gray-600 cursor-pointer"
                        >
                          {f === "4K" ? "4K Ultra HD" : f}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Purchase Price */}
              <div>
                <label htmlFor="purchasePrice" className={labelClass}>
                  Purchase Price
                </label>
                <input
                  type="number"
                  id="purchasePrice"
                  value={purchasePriceInput}
                  onChange={(e) => handlePurchasePriceChange(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>

              {/* Condition */}
              <div>
                <label htmlFor="condition" className={labelClass}>
                  Condition *
                </label>
                <select
                  id="condition"
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value })
                  }
                  required
                  className={inputClass + " cursor-pointer"}
                >
                  <option value="Sealed">Sealed</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Poor">Poor</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>
            </div>

            {/* Shelf Section */}
            <div>
              <label className={labelClass}>Shelf Section</label>
              <div className="flex gap-2">
                <select
                  value={formData.shelfSection}
                  onChange={(e) =>
                    setFormData({ ...formData, shelfSection: e.target.value })
                  }
                  className={inputClass + " cursor-pointer flex-1"}
                >
                  <option value="Unshelved">Unshelved</option>
                  {shelfSections.map((section) => (
                    <option key={section.id} value={section.name}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setShowShelfSectionInput(!showShelfSectionInput)
                  }
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer shrink-0"
                >
                  +
                </button>
              </div>
              {showShelfSectionInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newShelfSection}
                    onChange={(e) => setNewShelfSection(e.target.value)}
                    placeholder="New shelf section name"
                    className={inputClass + " flex-1"}
                  />
                  <button
                    type="button"
                    onClick={addShelfSection}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Shelf Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="shelfNumber" className={labelClass}>
                  Shelf Number
                </label>
                <input
                  type="text"
                  id="shelfNumber"
                  value={shelfInput}
                  onChange={(e) => handleShelfChange(e.target.value)}
                  className={inputClass}
                />
              </div>
              {/* HDD Number */}
              <div>
                <label htmlFor="hdDriveNumber" className={labelClass}>
                  HDD Number
                </label>
                <input
                  type="text"
                  id="hdDriveNumber"
                  value={hddInput}
                  onChange={(e) => handleHddChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Available on Plex */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOnPlex}
                onChange={(e) =>
                  setFormData({ ...formData, isOnPlex: e.target.checked })
                }
                className="w-5 h-5 bg-gray-700 border-gray-600 rounded focus:outline-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-300">
                Available on Plex
              </span>
            </label>
          </div>
        )}

        {/* Poster Details */}
        {activeTab === "poster" && (
          <div className="space-y-2 pb-2">
            {/* Movie Poster */}
            <div>
              <label htmlFor="posterPath" className={labelClass}>
                Movie Poster URL
              </label>
              <input
                type="text"
                id="posterPath"
                value={formData.posterPath}
                onChange={(e) =>
                  setFormData({ ...formData, posterPath: e.target.value })
                }
                placeholder="https://example.com/movie-poster.jpg"
                className={inputClass}
              />
              {formData.posterPath && (
                <img
                  src={formData.posterPath}
                  alt="Movie poster preview"
                  className="mt-3 h-48 rounded-md object-contain bg-gray-900"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
            
            {/* Product Poster */}
            <div>
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
              {formData.productPosterPath && (
                <img
                  src={formData.productPosterPath}
                  alt="Product image preview"
                  className="mt-3 h-48 rounded-md object-contain bg-gray-900"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

export default MovieForm;
