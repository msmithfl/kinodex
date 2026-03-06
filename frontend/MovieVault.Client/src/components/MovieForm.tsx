import { useState, useEffect } from "react";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import type { Movie } from "../types";

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
  onCancel,
  submitButtonText = "Save",
  showScanButton = false,
  onScanClick,
  onManualSearchClick,
}: MovieFormProps) {
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

  // Sync local state when formData changes (e.g., from TMDB search or editing different movie)
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
    if (!isNaN(num)) {
      setFormData({ ...formData, year: num });
    }
  };

  const handleShelfChange = (value: string) => {
    setShelfInput(value);
    const num = parseInt(value);
    if (!isNaN(num)) {
      setFormData({ ...formData, shelfNumber: num });
    }
  };

  const handleHddChange = (value: string) => {
    setHddInput(value);
    const num = parseInt(value);
    if (!isNaN(num)) {
      setFormData({ ...formData, hdDriveNumber: num });
    }
  };

  const handleTmdbChange = (value: string) => {
    setTmdbInput(value);
    if (value === "") {
      setFormData({ ...formData, tmdbId: undefined });
    } else {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setFormData({ ...formData, tmdbId: num });
      }
    }
  };

  const handlePurchasePriceChange = (value: string) => {
    setPurchasePriceInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setFormData({ ...formData, purchasePrice: num });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    // Validate numeric fields
    const yearNum = parseInt(yearInput);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setValidationError("Year must be a valid number between 1900 and 2100");
      return;
    }

    const shelfNum = parseInt(shelfInput);
    if (isNaN(shelfNum)) {
      setValidationError("Shelf Number must be a valid number");
      return;
    }

    const hddNum = parseInt(hddInput);
    if (isNaN(hddNum)) {
      setValidationError("HDD Number must be a valid number");
      return;
    }

    const purchasePriceNum = parseFloat(purchasePriceInput);
    if (isNaN(purchasePriceNum)) {
      setValidationError("Purchase Price must be a valid number");
      return;
    }

    await onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {" "}
      {validationError && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-md">
          {validationError}
        </div>
      )}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
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
            placeholder="Enter movie title"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="upc"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
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
              className="flex-1 max-w-42 md:max-w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
            />
            {showScanButton && onScanClick && (
              <>
                <button
                  type="button"
                  onClick={onScanClick}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
                  title="Scan barcode"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                {onManualSearchClick && (
                  <button
                    type="button"
                    onClick={onManualSearchClick}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
                    title="Search product images"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="year"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Year
          </label>
          <input
            type="text"
            id="year"
            value={yearInput}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder="Release year"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="tmdbId"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            TMDB ID
          </label>
          <input
            type="text"
            id="tmdbId"
            value={tmdbInput}
            onChange={(e) => handleTmdbChange(e.target.value)}
            placeholder="The Movie Database ID (optional)"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="purchasePrice"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Purchase Price
          </label>
          <input
            type="text"
            id="purchasePrice"
            value={purchasePriceInput}
            onChange={(e) => handlePurchasePriceChange(e.target.value)}
            placeholder="Purchase price"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hasWatched}
              onChange={(e) =>
                setFormData({ ...formData, hasWatched: e.target.checked })
              }
              className="w-5 h-5 bg-gray-700 border-gray-600 rounded focus:outline-none cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-300">Watched</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Formats *
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {formData.formats.map((fmt, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-full text-sm"
              >
                {fmt}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      formats: formData.formats.filter((_, i) => i !== index),
                    })
                  }
                  className="hover:text-red-300 transition cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (
                e.target.value &&
                !formData.formats.includes(e.target.value)
              ) {
                setFormData({
                  ...formData,
                  formats: [...formData.formats, e.target.value],
                });
              }
            }}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
          >
            <option value="">Add format...</option>
            <option value="4K" disabled={formData.formats.includes("4K")}>
              4K Ultra HD
            </option>
            <option
              value="Blu-ray"
              disabled={formData.formats.includes("Blu-ray")}
            >
              Blu-ray
            </option>
            <option value="DVD" disabled={formData.formats.includes("DVD")}>
              DVD
            </option>
            <option value="VHS" disabled={formData.formats.includes("VHS")}>
              VHS
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Genres
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {formData.genres.map((genre, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-full text-sm"
              >
                {genre}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      genres: formData.genres.filter((_, i) => i !== index),
                    })
                  }
                  className="hover:text-red-300 transition cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !formData.genres.includes(e.target.value)) {
                setFormData({
                  ...formData,
                  genres: [...formData.genres, e.target.value],
                });
              }
            }}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
          >
            <option value="">Add genre...</option>
            <option
              value="Action"
              disabled={formData.genres.includes("Action")}
            >
              Action
            </option>
            <option
              value="Adventure"
              disabled={formData.genres.includes("Adventure")}
            >
              Adventure
            </option>
            <option
              value="Animation"
              disabled={formData.genres.includes("Animation")}
            >
              Animation
            </option>
            <option
              value="Comedy"
              disabled={formData.genres.includes("Comedy")}
            >
              Comedy
            </option>
            <option value="Crime" disabled={formData.genres.includes("Crime")}>
              Crime
            </option>
            <option
              value="Documentary"
              disabled={formData.genres.includes("Documentary")}
            >
              Documentary
            </option>
            <option value="Drama" disabled={formData.genres.includes("Drama")}>
              Drama
            </option>
            <option
              value="Family"
              disabled={formData.genres.includes("Family")}
            >
              Family
            </option>
            <option
              value="Fantasy"
              disabled={formData.genres.includes("Fantasy")}
            >
              Fantasy
            </option>
            <option
              value="History"
              disabled={formData.genres.includes("History")}
            >
              History
            </option>
            <option
              value="Horror"
              disabled={formData.genres.includes("Horror")}
            >
              Horror
            </option>
            <option value="Music" disabled={formData.genres.includes("Music")}>
              Music
            </option>
            <option
              value="Mystery"
              disabled={formData.genres.includes("Mystery")}
            >
              Mystery
            </option>
            <option
              value="Romance"
              disabled={formData.genres.includes("Romance")}
            >
              Romance
            </option>
            <option
              value="Sci-Fi"
              disabled={formData.genres.includes("Sci-Fi")}
            >
              Sci-Fi
            </option>
            <option
              value="Thriller"
              disabled={formData.genres.includes("Thriller")}
            >
              Thriller
            </option>
            <option
              value="TV Movie"
              disabled={formData.genres.includes("TV Movie")}
            >
              TV Movie
            </option>
            <option value="War" disabled={formData.genres.includes("War")}>
              War
            </option>
            <option
              value="Western"
              disabled={formData.genres.includes("Western")}
            >
              Western
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="condition"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Condition *
          </label>
          <select
            id="condition"
            value={formData.condition}
            onChange={(e) =>
              setFormData({ ...formData, condition: e.target.value })
            }
            required
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
          >
            <option value="Sealed">Sealed</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Poor">Poor</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Collections
          </label>
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
                ) {
                  setFormData({
                    ...formData,
                    collections: [...formData.collections, e.target.value],
                  });
                }
              }}
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
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
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
              <button
                type="button"
                onClick={addCollection}
                className="px-4 md:px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
              >
                Add
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rating (0-5)
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFullStar = formData.rating >= star;
              const isHalfStar = formData.rating === star - 0.5;

              return (
                <div
                  key={star}
                  className="relative cursor-pointer group"
                  style={{ width: "32px", height: "32px" }}
                >
                  {/* Left half clickable area */}
                  <div
                    className="absolute left-0 top-0 w-1/2 h-full z-10"
                    onClick={() =>
                      setFormData({ ...formData, rating: star - 0.5 })
                    }
                    title={`${star - 0.5} stars`}
                  />
                  {/* Right half clickable area */}
                  <div
                    className="absolute right-0 top-0 w-1/2 h-full z-10"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    title={`${star} stars`}
                  />
                  {/* Star icon */}
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
          <p className="text-xs text-gray-400 mt-1">
            {formData.rating > 0 ? `${formData.rating} stars` : "Not rated"}
          </p>
        </div>

        <div>
          <label
            htmlFor="shelfNumber"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Shelf Number
          </label>
          <input
            type="text"
            id="shelfNumber"
            value={shelfInput}
            onChange={(e) => handleShelfChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Shelf Section
          </label>
          <div className="flex gap-2">
            <select
              value={formData.shelfSection}
              onChange={(e) =>
                setFormData({ ...formData, shelfSection: e.target.value })
              }
              className="flex-1 min-w-0 px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
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
              onClick={() => setShowShelfSectionInput(!showShelfSectionInput)}
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
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
              />
              <button
                type="button"
                onClick={addShelfSection}
                className="px-4 md:px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
              >
                Add
              </button>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="hdDriveNumber"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            HDD Number
          </label>
          <input
            type="text"
            id="hdDriveNumber"
            value={hddInput}
            onChange={(e) => handleHddChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="flex items-center">
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
      </div>
      <div>
        <label
          htmlFor="posterPath"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
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
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div>
        <label
          htmlFor="productPosterPath"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Product Image URL
        </label>
        <input
          type="text"
          id="productPosterPath"
          value={formData.productPosterPath}
          onChange={(e) =>
            setFormData({ ...formData, productPosterPath: e.target.value })
          }
          placeholder="https://example.com/product-image.jpg"
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div>
        <label
          htmlFor="review"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Review / Notes
        </label>
        <textarea
          id="review"
          value={formData.review}
          onChange={(e) => setFormData({ ...formData, review: e.target.value })}
          rows={4}
          placeholder="Add your review or notes about this movie..."
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
      </div>
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
        >
          {submitButtonText}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-md transition duration-200 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default MovieForm;
