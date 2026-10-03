import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { TMDBTvShow, TvShow } from "../types";
import {
  TV_GENRE_MAP,
  getTMDBTvSeasonCount,
  searchTMDBTv,
} from "../utils/tmdbApi";
import { isMobile } from "../utils/isMobile";
import TmdbSearchStep from "./TmdbSearchStep";
import TvShowForm from "./TvShowForm";
import BarcodeScanner from "./BarcodeScanner";
import { MobileOnlyMessage } from "./MobileOnlyMessage";

const FORM_ID = "add-tv-show-form";

const emptyTvShow = (): TvShow => ({
  title: "",
  hasWatched: false,
  rating: 0,
  review: "",
  year: new Date().getFullYear(),
  genres: [],
  posterPath: "",
  backdropPath: "",
  productPosterPath: "",
  tmdbId: undefined,
  totalSeasons: 0,
  isOnPlex: false,
  purchases: [],
});

interface AddTvShowModalProps {
  onClose: () => void;
}

export function AddTvShowModal({ onClose }: AddTvShowModalProps) {
  const { getToken } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TvShow>(emptyTvShow);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  // Which purchase a barcode scan fills in; null when the scanner is closed
  const [scanPurchaseIndex, setScanPurchaseIndex] = useState<number | null>(null);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/tvshows`;

  const handleShowSelect = async (show: TMDBTvShow) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        window.location.href = "/tv-shows";
      } else {
        const body = await response.json().catch(() => null);
        setSubmitError(
          body?.error ??
            `Failed to add TV show (${response.status}). Please try again.`,
        );
      }
    } catch (error) {
      console.error("Error adding TV show:", error);
      setSubmitError(
        "Could not reach the server. Please check your connection.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleScanClick = (purchaseIndex: number) => {
    if (isMobile()) {
      setScanPurchaseIndex(purchaseIndex);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p, i) =>
        i === scanPurchaseIndex ? { ...p, upcNumber: code } : p,
      ),
    }));
    setScanPurchaseIndex(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex flex-col mx-2 bg-gray-800 shadow-2xl w-full max-w-3xl h-full max-h-3/4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 justify-between bg-gray-700 p-2">
          <p className="text-white text-xl pl-2">Add TV Show</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {!showForm && (
          <TmdbSearchStep
            search={searchTMDBTv}
            toOption={(show) => ({
              id: show.id,
              title: show.name,
              date: show.first_air_date,
              posterPath: show.poster_path,
            })}
            onSelect={handleShowSelect}
            onManualEntry={() => setShowForm(true)}
            placeholder="Search TMDB for a TV show..."
          />
        )}
        {showForm && (
          <div className="flex flex-col flex-1 min-h-0 px-4">
            <TvShowForm
              formId={FORM_ID}
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onScanClick={handleScanClick}
            />

            {scanPurchaseIndex !== null && (
              <BarcodeScanner
                onDetected={handleBarcodeDetected}
                onClose={() => setScanPurchaseIndex(null)}
              />
            )}

            {showMobileOnlyMessage && (
              <MobileOnlyMessage
                setShowMobileOnlyMessage={setShowMobileOnlyMessage}
              />
            )}
          </div>
        )}

        <div className="flex flex-col px-6 py-3 bg-gray-700 gap-2">
          {submitError && (
            <p className="text-red-400 text-sm text-right">{submitError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition cursor-pointer"
            >
              Close
            </button>
            {/* Submits the form so its validation runs; nothing to save until a show is chosen or entered */}
            <button
              type="submit"
              form={FORM_ID}
              disabled={!showForm || saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
