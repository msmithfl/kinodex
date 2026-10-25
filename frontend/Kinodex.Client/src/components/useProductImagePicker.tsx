import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { FaCheck } from "react-icons/fa";

interface ProductImagePickerOptions {
  upc: string; // The barcode to look up
  selected: string; // The current product image URL
  onSelect: (imageUrl: string) => void;
}

// What /api/upc/lookup returns
interface UpcLookupResult {
  found: boolean;
  title: string;
  images: string[];
  cached: boolean; // From saved results, so it didn't use a lookup
  remaining: number | null; // Lookups left today, when UPCitemdb was just called
}

// Lets the user pick a product image (the disc's box art from retailers) found by its UPC.
// Built like useImagePicker: returns the toggle button and the image grid separately, so a form
// can put the button beside its URL field and the grid full width underneath. The lookup only
// runs when the button is pressed. UPCs looked up before (by anyone) come from saved results;
// new ones use one of the server's 100 daily UPCitemdb lookups.
export function useProductImagePicker({ upc, selected, onSelect }: ProductImagePickerOptions) {
  const { getToken } = useAuth();
  const [result, setResult] = useState<UpcLookupResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const trimmedUpc = upc.trim();
  const validUpc = /^\d{8,14}$/.test(trimmedUpc);

  // A different UPC means a different product: drop the result and close the grid
  const [loadedFor, setLoadedFor] = useState(trimmedUpc);
  if (trimmedUpc !== loadedFor) {
    setLoadedFor(trimmedUpc);
    setResult(null);
    setOpen(false);
    setError("");
  }

  const lookUp = async () => {
    setLoading(true);
    setError("");
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/upc/lookup/${trimmedUpc}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body) {
        setResult(body);
      } else {
        // The server explains the limit, a bad UPC or an unreachable service
        setError(body?.message ?? `Product lookup failed (${response.status}).`);
      }
    } catch {
      setError("Couldn't reach the server to look up this UPC.");
    } finally {
      setLoading(false);
    }
  };

  // The button opens and closes the grid; the lookup runs the first time only (or again after
  // a failed one)
  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (result === null) await lookUp();
  };

  const button = !validUpc ? (
    <p className="text-xs text-gray-400">
      Add a UPC on the details tab to find product images for it.
    </p>
  ) : (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-expanded={open}
      className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
    >
      {loading ? "Looking up UPC..." : open ? "Close product images" : "Find product images"}
    </button>
  );

  const images = result?.images ?? [];
  const grid = !open ? null : (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && (
        <p className="text-xs text-gray-400">
          {result.found && result.title ? (
            <>
              <span className="text-gray-300">{result.title}</span> ·{" "}
            </>
          ) : null}
          {result.cached
            ? "From saved results"
            : result.remaining !== null
              ? `${result.remaining} lookups left today`
              : "Looked up just now"}
        </p>
      )}
      {result && images.length === 0 && (
        <p className="text-xs text-gray-400">
          {result.found
            ? "No product images were found for this UPC."
            : "No product was found for this UPC."}
        </p>
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
          {images.map((url) => {
            const isSelected = selected === url;
            return (
              <button
                key={url}
                type="button"
                onClick={() => onSelect(url)}
                aria-pressed={isSelected}
                className={`relative block w-full aspect-square rounded overflow-hidden border-2 bg-white transition cursor-pointer ${
                  isSelected ? "border-indigo-500" : "border-transparent hover:border-gray-400"
                }`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain"
                  // Retailer links break over time; hide ones that don't load
                  onError={(e) => {
                    const tile = e.currentTarget.parentElement;
                    if (tile) tile.style.display = "none";
                  }}
                />
                {isSelected && (
                  <span className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-1">
                    <FaCheck className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return { button, grid };
}
