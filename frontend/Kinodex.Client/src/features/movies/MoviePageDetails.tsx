import { Link } from "react-router-dom";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { FaBarcode } from "react-icons/fa6";
import { FormatIcon } from "../../utils/formatIcon";
import { openEbaySoldListings, useCopyToClipboard } from "../../utils/upc";
import { formatPurchaseDate } from "../../utils/dateUtils";
import type { Movie } from "../../types";

interface MoviePageDetailsProps {
  movie: Movie;
  onEnlargeProductImage: () => void;
  // Edit and delete, shown under the notes on tablets only (mobile and desktop show them up top)
  actionButtons: React.ReactNode;
}

// The full movie page's detail sections (the drawer uses the compact MovieDrawerDetails instead):
// formats and condition, price and the disc (eBay, product image, barcode), shelf, HDD and
// streaming, collections, watched, then review/notes
function MoviePageDetails({ movie, onEnlargeProductImage, actionButtons }: MoviePageDetailsProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <>
      {/* Physical Details Section */}
      <div className="mb-8">
        <div>
          <div className="flex p-4 border-b-[0.5px] border-white/20">
            <div className="w-1/2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Formats</h3>
              {movie.formats && movie.formats.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {[...movie.formats].sort().map((fmt, idx) => (
                    <FormatIcon key={idx} fmt={fmt} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">None</p>
              )}
            </div>
            <div className="w-1/2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Condition</h3>
              <span>{movie.condition}</span>
            </div>
          </div>

          <div className="flex p-4 border-b-[0.5px] border-white/20">
            <div className="w-1/2 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Purchase Price</h3>
                <p className="text-base font-mono text-white">
                  {movie.purchasePrice > 0 ? (
                    `$${movie.purchasePrice.toFixed(2)}`
                  ) : (
                    <span className="text-gray-500">Not set</span>
                  )}
                </p>
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Purchase Date</h3>
                <p className="text-base text-white">
                  {movie.purchasedAt ? (
                    formatPurchaseDate(movie.purchasedAt)
                  ) : (
                    <span className="text-gray-500">Not set</span>
                  )}
                </p>
              </div>
              <div>
                <div className="relative inline-block">
                  <button
                    onClick={() => openEbaySoldListings(movie.upcNumber)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-xs lg:text-sm cursor-pointer w-auto lg:w-full"
                  >
                    Search eBay
                  </button>
                </div>
              </div>
            </div>
            <div className="w-1/2 flex items-end">
              {/* Product Image & eBay Button - Right */}
              <div className="flex flex-col items-start gap-4">
                {movie.productPosterPath && (
                  <button
                    type="button"
                    onClick={onEnlargeProductImage}
                    className="block cursor-zoom-in"
                    aria-label={`Enlarge the ${movie.title} product image`}
                  >
                    <img
                      src={movie.productPosterPath}
                      alt={`${movie.title} product`}
                      className="rounded-lg shadow-md w-24 lg:w-32 h-auto object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                )}
                <div className="relative inline-block">
                  <button
                    onClick={() => copy(movie.upcNumber)}
                    title="Copy to clipboard"
                    className="text-base font-mono text-white rounded-md cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <FaBarcode />
                      <p className="text-base font-mono text-white">{movie.upcNumber}</p>
                    </div>
                  </button>
                  {copied && (
                    <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 text-green-400 text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                      Copied!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex p-4 border-b-[0.5px] border-white/20">
            <div className="w-1/2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Shelf Section</h3>
              <Link
                to={`/shelfsections/${encodeURIComponent(movie.shelfSection || "Unshelved")}`}
                className="cursor-pointer hover:underline"
              >
                {movie.shelfSection || "Unshelved"}
              </Link>
            </div>
            <div className="w-1/2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Shelf Number</h3>
              <p className="text-base font-mono text-white">
                {movie.shelfNumber > 0 ? (
                  `${movie.shelfNumber}`
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex p-4 border-b-[0.5px] border-white/20">
            <div className="w-1/2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">HDD Number</h3>
              <p className="text-base font-mono text-white">
                {movie.hdDriveNumber > 0 ? (
                  `${movie.hdDriveNumber}`
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </p>
            </div>

            <div className="w-1/2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Streaming</h3>
              <p className="text-base text-white flex items-center gap-2">
                {movie.isOnPlex ? (
                  <>
                    <HiSignal className="w-5 h-5" /> Yes
                  </>
                ) : (
                  <>
                    <HiOutlineSignalSlash className="w-5 h-5" /> No
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Location Details Section */}
          <div className="flex p-4 border-b-[0.5px] border-white/20">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Collections</h3>
              {movie.collections && movie.collections.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {movie.collections.map((col, idx) => (
                    <Link
                      key={idx}
                      to={`/collections?collection=${encodeURIComponent(col)}`}
                      className="cursor-pointer hover:underline"
                    >
                      {col}
                      {idx < movie.collections.length - 1 ? "," : ""}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">None</p>
              )}
            </div>
          </div>

          <div className="flex flex-col p-4 border-b-[0.5px] border-white/20">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Watched</h3>
            <p className="text-base text-white flex items-center gap-2">
              {movie.hasWatched ? (
                <>
                  <LuEye className="w-5 h-5" /> Yes
                </>
              ) : (
                <>
                  <LuEyeClosed className="w-5 h-5" /> No
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="mb-8">
        <div className="m-4 p-6 bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Review / Notes</h3>
          {movie.review ? (
            <p className="text-white whitespace-pre-wrap">{movie.review}</p>
          ) : (
            <p className="text-gray-500 italic">No review or notes added</p>
          )}
        </div>
        {/* Tablet only; mobile and desktop show these near the top */}
        <div className="hidden md:flex lg:hidden justify-center gap-2 mt-2">{actionButtons}</div>
      </div>
    </>
  );
}

export default MoviePageDetails;
