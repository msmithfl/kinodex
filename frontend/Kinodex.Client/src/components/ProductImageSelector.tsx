import { useState, useEffect } from "react";

interface ProductImageSelectorProps {
  upc: string;
  onSelect: (imageUrl: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

interface UPCItem {
  title?: string;
  description?: string;
  images?: string[];
}

interface UPCResponse {
  code: string;
  message?: string;
  items?: UPCItem[];
}

function ProductImageSelector({
  upc,
  onSelect,
  onSkip,
  onClose,
}: ProductImageSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [productTitle, setProductTitle] = useState<string>("");
  const [apiCallsRemaining, setApiCallsRemaining] = useState<string | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

  useEffect(() => {
    const fetchProductImages = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/upc/lookup/${upc}`);

        // Get API calls remaining from header (case-insensitive)
        const remaining = response.headers.get("x-ratelimit-remaining");
        if (remaining) {
          setApiCallsRemaining(remaining);
        }

        const data: UPCResponse = await response.json();

        if (data.code === "INVALID_UPC" || data.code === "ERROR") {
          setError(data.message || "Invalid UPC code");
          setLoading(false);
          return;
        }

        if (data.code === "OK" && data.items && data.items.length > 0) {
          const item = data.items[0];
          setProductTitle(item.title || item.description || "Unknown Product");

          // Filter and prioritize HTTPS images, remove known bad domains
          const filteredImages = (item.images || [])
            .filter((url) => {
              // Skip if not a valid URL
              if (!url || typeof url !== "string") return false;

              // Skip known problematic domains
              const badDomains = ["secondspin.com", "sdcd.us", "fye.com"];
              if (badDomains.some((domain) => url.includes(domain)))
                return false;

              return true;
            })
            // Prefer HTTPS URLs
            .sort((a, b) => {
              if (a.startsWith("https://") && !b.startsWith("https://"))
                return -1;
              if (!a.startsWith("https://") && b.startsWith("https://"))
                return 1;
              return 0;
            });

          setImages(filteredImages);
        } else {
          setError("No product images found for this UPC");
        }
      } catch (err) {
        console.error("Error fetching product images:", err);
        setError("Failed to fetch product images");
      } finally {
        setLoading(false);
      }
    };

    fetchProductImages();
  }, [upc]);

  const handleSelectImage = () => {
    if (selectedImage) {
      onSelect(selectedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">
              Select Product Image
            </h3>
            {apiCallsRemaining && (
              <p className="text-sm text-gray-400 mt-1">
                API Calls Remaining Today: {apiCallsRemaining}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading product images...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
            >
              Continue Without Image
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">
              No product images available for this UPC
            </p>
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
            >
              Continue Without Image
            </button>
          </div>
        ) : (
          <>
            {productTitle && (
              <p className="text-gray-300 mb-4">
                <span className="font-semibold">Product:</span> {productTitle}
              </p>
            )}
            <p className="text-gray-400 text-sm mb-4">
              Select an image to use as the product poster:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {images.map((imageUrl, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImage(imageUrl)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === imageUrl
                      ? "border-indigo-500 ring-2 ring-indigo-500"
                      : "border-gray-600 hover:border-gray-400"
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`Product ${index + 1}`}
                    className="w-full h-48 object-contain bg-white"
                    onError={(e) => {
                      // Hide the parent div instead of just the image
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.display = "none";
                      }
                    }}
                  />
                  {selectedImage === imageUrl && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleSelectImage}
                disabled={!selectedImage}
                className={`flex-1 py-3 px-6 rounded-md transition font-semibold ${
                  selectedImage
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                Use Selected Image
              </button>
              <button
                onClick={onSkip}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition font-semibold"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProductImageSelector;
