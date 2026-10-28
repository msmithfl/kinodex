import { Link } from "react-router-dom";
import { LuEye, LuEyeClosed, LuGift } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { FaBarcode } from "react-icons/fa6";
import { FormatIcon } from "../../utils/formatIcon";
import { openEbaySoldListings, useCopyToClipboard } from "../../utils/upc";
import { formatPurchaseDate } from "../../utils/dateUtils";
import type { Movie } from "../../types";

interface MovieDrawerDetailsProps {
  movie: Movie;
  onEnlargeProductImage: () => void;
}

const notSet = <span className="text-gray-500">Not set</span>;

// One labelled value in the details grid
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-white truncate">{children}</dd>
    </div>
  );
}

// The movie drawer's Details tab: everything about the copy, packed to fit without
// scrolling - a grid of short values, then the disc (barcode, eBay), collections and notes
function MovieDrawerDetails({ movie, onEnlargeProductImage }: MovieDrawerDetailsProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* The copy, then where it lives */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <Field label="Formats">
          {movie.formats && movie.formats.length > 0 ? (
            <span className="flex flex-wrap gap-2">
              {[...movie.formats].sort().map((fmt, idx) => (
                <FormatIcon key={idx} fmt={fmt} />
              ))}
            </span>
          ) : (
            <span className="text-gray-500">None</span>
          )}
        </Field>
        <Field label="Condition">{movie.condition || notSet}</Field>
        <Field label="Paid">
          {movie.purchasePrice > 0 ? (
            <span className="font-mono">${movie.purchasePrice.toFixed(2)}</span>
          ) : (
            notSet
          )}
        </Field>
        <Field label="Purchased">
          {movie.purchasedAt ? formatPurchaseDate(movie.purchasedAt) : notSet}
        </Field>
        <Field label="Gift">
          <span className="flex items-center gap-1.5">
            <LuGift className={`w-4 h-4 ${movie.isGift ? "" : "text-gray-500"}`} />
            {movie.isGift ? "Yes" : "No"}
          </span>
        </Field>
        <Field label="Watched">
          <span className="flex items-center gap-1.5">
            {movie.hasWatched ? (
              <>
                <LuEye className="w-4 h-4" /> Yes
              </>
            ) : (
              <>
                <LuEyeClosed className="w-4 h-4" /> No
              </>
            )}
          </span>
        </Field>
        <Field label="Shelf">
          <Link
            to={`/shelfsections/${encodeURIComponent(movie.shelfSection || "Unshelved")}`}
            className="hover:underline"
          >
            {movie.shelfSection || "Unshelved"}
          </Link>
        </Field>
        <Field label="Shelf #">
          {movie.shelfNumber > 0 ? <span className="font-mono">{movie.shelfNumber}</span> : notSet}
        </Field>
        <Field label="HDD #">
          {movie.hdDriveNumber > 0 ? <span className="font-mono">{movie.hdDriveNumber}</span> : notSet}
        </Field>
        <Field label="Streaming">
          <span className="flex items-center gap-1.5">
            {movie.isOnPlex ? (
              <>
                <HiSignal className="w-4 h-4" /> Yes
              </>
            ) : (
              <>
                <HiOutlineSignalSlash className="w-4 h-4" /> No
              </>
            )}
          </span>
        </Field>
      </dl>

      {/* The disc: product shot, barcode (click to copy) and an eBay sold-listings search */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 border border-white/10">
        {movie.productPosterPath && (
          <button
            type="button"
            onClick={onEnlargeProductImage}
            className="shrink-0 cursor-zoom-in"
            aria-label={`Enlarge the ${movie.title} product image`}
          >
            <img
              src={movie.productPosterPath}
              alt={`${movie.title} product`}
              className="h-14 w-auto rounded shadow object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </button>
        )}
        <div className="relative min-w-0">
          {movie.upcNumber ? (
            <button
              onClick={() => copy(movie.upcNumber)}
              title="Copy to clipboard"
              className="flex items-center gap-1.5 font-mono text-sm text-white hover:text-indigo-300 cursor-pointer"
            >
              <FaBarcode className="shrink-0" />
              <span className="truncate">{movie.upcNumber}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <FaBarcode className="shrink-0" /> No UPC
            </span>
          )}
          {copied && (
            <span className="absolute top-full mt-1 left-0 bg-gray-900 text-green-400 text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
              Copied!
            </span>
          )}
        </div>
        {movie.upcNumber && (
          <button
            onClick={() => openEbaySoldListings(movie.upcNumber)}
            className="ml-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 text-xs cursor-pointer"
          >
            Search eBay
          </button>
        )}
      </div>

      {/* Collections, as links that open each one's drawer */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Collections</h3>
        {movie.collections && movie.collections.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {movie.collections.map((col, idx) => (
              <Link
                key={idx}
                to={`/collections?collection=${encodeURIComponent(col)}`}
                className="px-2.5 py-0.5 rounded-full text-sm bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                {col}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-500">None</p>
        )}
      </div>

      {/* Review / notes */}
      <div className="p-3 rounded-lg bg-gray-800/60 border border-white/10">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Review / Notes
        </h3>
        {movie.review ? (
          <p className="mt-1 text-sm text-white whitespace-pre-wrap">{movie.review}</p>
        ) : (
          <p className="mt-1 text-sm text-gray-500 italic">No review or notes added</p>
        )}
      </div>
    </div>
  );
}

export default MovieDrawerDetails;
