import { IoClose } from "react-icons/io5";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Movie } from "../types";
import MovieForm from "./MovieForm";
import { useAuth } from "@clerk/clerk-react";
import BarcodeScanner from "./BarcodeScanner";
import { MobileOnlyMessage } from "./MobileOnlyMessage";

interface EditMovieModalProps {
  onClose: () => void;
}

export function EditMovieModal({ onClose }: EditMovieModalProps) {
  const { getToken } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [_loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Movie>({
    userId: "",
    title: "",
    upcNumber: "",
    formats: [],
    collections: [],
    condition: "Like New",
    purchasePrice: 0,
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
    isOnPlex: false,
  });
  const [collections, setCollections] = useState<
    { id: number; name: string }[]
  >([]);
  const [shelfSections, setShelfSections] = useState<
    { id: number; name: string }[]
  >([]);
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [showShelfSectionInput, setShowShelfSectionInput] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [newShelfSection, setNewShelfSection] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [_showProductImageSelector, _setShowProductImageSelector] =
    useState(false);
  const [_scannedUpc, setScannedUpc] = useState("");
  const [_showManualUpcInput, _setShowManualUpcInput] = useState(false);
  const [_manualUpc, _setManualUpc] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;
  const COLLECTIONS_URL = `${API_BASE}/api/collections`;
  const SHELF_SECTIONS_URL = `${API_BASE}/api/shelfsections`;

  // Check if device is mobile
  const isMobile = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  };

  useEffect(() => {
    fetchMovie();
    // Load collections and shelf sections from API
    const fetchData = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [collectionsRes, shelfSectionsRes] = await Promise.all([
          fetch(COLLECTIONS_URL, { headers }),
          fetch(SHELF_SECTIONS_URL, { headers }),
        ]);

        if (collectionsRes.ok) {
          const collectionsData = await collectionsRes.json();
          setCollections(collectionsData);
        }

        if (shelfSectionsRes.ok) {
          const shelfSectionsData = await shelfSectionsRes.json();
          setShelfSections(shelfSectionsData);
        }
      } catch (error) {
        console.error("Error loading collections and shelf sections:", error);
      }
    };

    fetchData();
  }, []);

  const fetchMovie = async () => {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error("Error fetching movie:", error);
    } finally {
      setLoading(false);
    }
  };

  const addCollection = async () => {
    if (newCollection && !collections.find((c) => c.name === newCollection)) {
      try {
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        const response = await fetch(COLLECTIONS_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: newCollection }),
        });

        if (response.ok) {
          const newCollectionData = await response.json();
          setCollections(
            [...collections, newCollectionData].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setFormData({
            ...formData,
            collections: [...formData.collections, newCollection],
          });
          setNewCollection("");
          setShowCollectionInput(false);
        }
      } catch (error) {
        console.error("Error adding collection:", error);
      }
    }
  };

  const addShelfSection = async () => {
    if (
      newShelfSection &&
      !shelfSections.find((s) => s.name === newShelfSection)
    ) {
      try {
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        const response = await fetch(SHELF_SECTIONS_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: newShelfSection }),
        });

        if (response.ok) {
          const newShelfSectionData = await response.json();
          setShelfSections(
            [...shelfSections, newShelfSectionData].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          setFormData({ ...formData, shelfSection: newShelfSection });
          setNewShelfSection("");
          setShowShelfSectionInput(false);
        }
      } catch (error) {
        console.error("Error adding shelf section:", error);
      }
    }
  };

  const handleManualSearchClick = () => {
    _setManualUpc(formData.upcNumber);
    _setShowManualUpcInput(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setSubmitError("Movie title is required.");
      return;
    }
    setSubmitError("");
    try {
      const token = await getToken();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating movie:", error);
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
    setScannedUpc(code);
    setShowScanner(false);
    //setShowProductImageSelector(true);
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
          <p className="text-white text-xl pl-2">Editing {formData.title}</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 px-4">
          <MovieForm
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
            onManualSearchClick={handleManualSearchClick}
          />

          {showScanner && (
            <BarcodeScanner
              onDetected={handleBarcodeDetected}
              onClose={() => setShowScanner(false)}
            />
          )}

          {showMobileOnlyMessage && (
            <MobileOnlyMessage
              setShowMobileOnlyMessage={setShowMobileOnlyMessage}
            />
          )}
        </div>

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
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
