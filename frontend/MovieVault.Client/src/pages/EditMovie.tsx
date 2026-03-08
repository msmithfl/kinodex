import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Movie } from "../types";
import MovieForm from "../components/MovieForm";
import BarcodeScanner from "../components/BarcodeScanner";
import ProductImageSelector from "../components/ProductImageSelector";
import { MobileOnlyMessage } from "../components/MobileOnlyMessage";

function EditMovie() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<Movie>({
    userId: "",
    title: "",
    upcNumber: "",
    formats: [],
    collections: [],
    condition: "New",
    purchasePrice: 0,
    hasWatched: false,
    rating: 0,
    review: "",
    year: new Date().getFullYear(),
    genres: [],
    posterPath: "",
    productPosterPath: "",
    hdDriveNumber: 0,
    shelfNumber: 1,
    shelfSection: "",
    isOnPlex: true,
  });
  const [loading, setLoading] = useState(true);
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
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showProductImageSelector, setShowProductImageSelector] =
    useState(false);
  const [scannedUpc, setScannedUpc] = useState("");
  const [showManualUpcInput, setShowManualUpcInput] = useState(false);
  const [manualUpc, setManualUpc] = useState("");

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
        const [collectionsRes, shelfSectionsRes] = await Promise.all([
          fetch(COLLECTIONS_URL),
          fetch(SHELF_SECTIONS_URL),
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
  }, [id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate(`/movie/${id}`);
      }
    } catch (error) {
      console.error("Error updating movie:", error);
    }
  };

  const addCollection = async () => {
    if (newCollection && !collections.find((c) => c.name === newCollection)) {
      try {
        const response = await fetch(COLLECTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        const response = await fetch(SHELF_SECTIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

  const handleBarcodeDetected = (code: string) => {
    setFormData({ ...formData, upcNumber: code });
    setScannedUpc(code);
    setShowScanner(false);
    setShowProductImageSelector(true);
  };

  const handleProductImageSelect = (imageUrl: string) => {
    setFormData({ ...formData, productPosterPath: imageUrl });
    setShowProductImageSelector(false);
    setScannedUpc("");
  };

  const handleProductImageSkip = () => {
    setShowProductImageSelector(false);
    setScannedUpc("");
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleManualSearchClick = () => {
    setManualUpc(formData.upcNumber);
    setShowManualUpcInput(true);
  };

  const handleManualUpcSearch = () => {
    if (manualUpc.trim()) {
      setScannedUpc(manualUpc);
      setShowManualUpcInput(false);
      setShowProductImageSelector(true);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-center text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/movie/${id}`)}
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors cursor-pointer"
        >
          ← Back to Movie
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6">Edit Movie</h2>
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
          onCancel={() => navigate(`/movie/${id}`)}
          submitButtonText="Save Changes"
          showScanButton={true}
          onScanClick={handleScanClick}
          onManualSearchClick={handleManualSearchClick}
        />
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showProductImageSelector && scannedUpc && (
        <ProductImageSelector
          upc={scannedUpc}
          onSelect={handleProductImageSelect}
          onSkip={handleProductImageSkip}
          onClose={handleProductImageSkip}
        />
      )}

      {showManualUpcInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                Search Product Images
              </h3>
              <button
                onClick={() => setShowManualUpcInput(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-gray-300 mb-4">
              Enter UPC code to search for product images:
            </p>
            <input
              type="text"
              value={manualUpc}
              onChange={(e) => setManualUpc(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleManualUpcSearch()}
              placeholder="Enter UPC code"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={handleManualUpcSearch}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition font-semibold"
              >
                Search
              </button>
              <button
                onClick={() => setShowManualUpcInput(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMobileOnlyMessage && (
        <MobileOnlyMessage
          setShowMobileOnlyMessage={setShowMobileOnlyMessage}
        />
      )}
    </div>
  );
}

export default EditMovie;
