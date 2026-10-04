import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  TiStarOutline,
  TiStarHalfOutline,
  TiStarFullOutline,
} from "react-icons/ti";
import { FaEdit, FaTrash } from "react-icons/fa";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import { FaBarcode } from "react-icons/fa6";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import { EditTvShowModal } from "../components/EditTvShowModal";
import type { TvShow } from "../types";
import { FormatIcon } from "../utils/formatIcon";
import { formatSeasons } from "../utils/formatSeasons";
import {
  formatPurchaseDate,
  ownedSeasons,
  ownsEverySeason,
  purchaseKey,
  totalPaid,
} from "../utils/tvShowPurchases";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";

function TvShowDetail() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [show, setShow] = useState<TvShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Which purchase's UPC was just copied, for the "Copied!" hint
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // Size the page to the viewport below the header
  const container = useFillViewportHeight<HTMLDivElement>([loading]);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/tvshows/${id}`;

  useEffect(() => {
    const fetchShow = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const token = await getToken();
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setShow(await response.json());
        } else if (response.status === 404) {
          navigate("/tv-shows");
        } else {
          setLoadError(`Could not load this TV show (${response.status}).`);
        }
      } catch (error) {
        console.error("Error fetching TV show:", error);
        setLoadError("Could not reach the server to load this TV show.");
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [id]);

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleteError("");
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        navigate("/tv-shows");
      } else {
        setDeleteError(
          `Failed to delete ${show?.title ?? "this TV show"} (${response.status}). Please try again.`,
        );
      }
    } catch (error) {
      console.error("Error deleting TV show:", error);
      setDeleteError("Could not reach the server. Please check your connection.");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!show) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-400">
          {loadError || "TV show not found"}
        </p>
      </div>
    );
  }

  // Edit and delete, placed per screen size: over the backdrop on mobile, at the bottom on tablet,
  // and in the header's bottom-right corner on desktop
  const actionButtons = (
    <>
      <button
        onClick={() => setShowEditModal(true)}
        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Edit TV show"
      >
        <FaEdit className="w-5 h-5" />
      </button>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
        aria-label="Delete TV show"
      >
        <FaTrash className="w-5 h-5" />
      </button>
    </>
  );

  const allSeasons = Array.from({ length: show.totalSeasons }, (_, i) => i + 1);
  const owned = ownedSeasons(show.purchases);

  return (
    <div
      ref={container.ref}
      className="relative h-[calc(100dvh-5rem)] flex flex-col"
      style={container.style}
    >
      {show.backdropPath && (
        <>
          {/* Desktop: fixed background scoped to this container */}
          <div
            className="hidden md:block absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `url(${show.backdropPath})`,
              backgroundAttachment: "fixed",
              backgroundSize: "cover",
              backgroundPosition: "top center",
            }}
          />
          <div className="hidden md:block absolute inset-0 pointer-events-none bg-linear-to-b from-gray-900/60 via-gray-900/80 to-gray-900" />
        </>
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto z-10 md:relative md:inset-auto md:flex-1 md:min-h-0 md:z-auto">
          {/* Mobile: in-flow hero banner that scrolls away with the content */}
          {show.backdropPath && (
            <div className="relative h-56 md:hidden pointer-events-none">
              <img
                src={show.backdropPath}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-x-0 top-0 -bottom-0.5 bg-linear-to-b from-gray-900/20 to-gray-900" />
              {/* Mobile: edit and delete over the backdrop's top-left corner */}
              <div className="absolute top-3 left-3 flex gap-1 rounded-md bg-gray-900/70 backdrop-blur-sm pointer-events-auto">
                {actionButtons}
              </div>
            </div>
          )}
          {/* Mobile without a backdrop: same buttons, top-left above the title */}
          {!show.backdropPath && (
            <div className="md:hidden flex gap-1 px-2 pt-2">{actionButtons}</div>
          )}
          {/* Shown at the top, near the delete button on mobile and desktop */}
          {deleteError && (
            <p className="text-red-400 text-sm text-center px-4 pt-2">
              {deleteError}
            </p>
          )}
          <div className="mx-auto max-w-4xl lg:max-w-6xl pt-2 md:pt-6 lg:px-6">
            {/* Mobile and tablet: one column, title block beside the poster at the top.
                Desktop: a grid with the title block across the top, details on the left and the poster on the right.
                The header's wrappers use lg:contents so the title block and poster become grid items on desktop
                without changing the mobile markup. */}
            <div className="overflow-hidden lg:overflow-visible lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-x-10 lg:gap-y-4 lg:items-start">
              {/* Show Details Header */}
              <div className="px-4 pb-4 border-b-[0.5px] border-white/20 lg:contents">
                <div className="flex justify-between md:justify-start gap-4 md:gap-0 lg:contents">
                  {/* Title, Year, Rating, Genres. Desktop: title, year and TMDB on one line, genres below, stars below that */}
                  <div className="md:ml-10 lg:ml-0 flex flex-col justify-center lg:flex-row lg:flex-wrap lg:justify-start lg:items-center lg:gap-x-4 lg:gap-y-1 lg:col-span-2 lg:row-start-1 lg:px-4 lg:pb-3 lg:border-b-[0.5px] lg:border-white/20 lg:relative">
                    {/* Desktop: edit and delete in the header's bottom-right corner */}
                    <div className="hidden lg:flex absolute right-4 bottom-2 gap-1">
                      {actionButtons}
                    </div>
                    <h1 className="text-xl lg:text-3xl font-bold text-white lg:order-1">
                      {show.title}
                    </h1>

                    <div className="flex items-center gap-4 lg:gap-3 lg:order-2">
                      <p className="text-sm lg:text-xl text-white">
                        {show.year || (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </p>
                      <a
                        href={
                          show.tmdbId
                            ? `https://www.themoviedb.org/tv/${show.tmdbId}`
                            : "https://www.themoviedb.org/"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                        title={show.tmdbId ? "View on TMDB" : "Search on TMDB"}
                      >
                        <img
                          src="/tmdb-icon.png"
                          alt="TMDB"
                          className="w-8 h-8 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    </div>

                    <div className="flex gap-1 items-center lg:order-4 lg:basis-full">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFullStar = show.rating >= star;
                        const isHalfStar = show.rating === star - 0.5;
                        return (
                          <div key={star}>
                            {isFullStar ? (
                              <TiStarFullOutline className="w-6 h-6 text-yellow-400" />
                            ) : isHalfStar ? (
                              <TiStarHalfOutline className="w-6 h-6 text-yellow-400" />
                            ) : (
                              <TiStarOutline className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="lg:order-3 lg:basis-full">
                      {show.genres.length > 0 ? (
                        <p className="text-sm mt-1 lg:mt-0">{show.genres.join(", ")}</p>
                      ) : (
                        <p className="text-gray-500 italic text-sm lg:text-base">
                          No genres
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Poster; desktop: right column, stays in view while the details scroll */}
                  <div className="lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4">
                    {show.posterPath ? (
                      <img
                        src={show.posterPath}
                        alt={`${show.title} poster`}
                        className="border-[0.5px] border-white/20 rounded shadow-lg max-w-25 md:max-w-60 lg:max-w-none lg:w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://via.placeholder.com/300x450?text=No+Poster";
                        }}
                      />
                    ) : (
                      <div className="bg-gray-700 border-[0.5px] border-white/20 rounded-lg flex items-center justify-center h-full min-h-75 px-4">
                        <p className="text-gray-500 text-xs lg:text-base">
                          No poster
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details column */}
              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <div className="mb-8">
                  {/* Seasons */}
                  <div className="p-4 border-b-[0.5px] border-white/20">
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-400">
                        Seasons Owned
                      </h3>
                      {show.totalSeasons > 0 && (
                        <span className="text-xs text-gray-400">
                          {ownsEverySeason(show)
                            ? "Complete series"
                            : `${owned.length} of ${show.totalSeasons} seasons`}
                        </span>
                      )}
                    </div>
                    {show.totalSeasons > 0 ? (
                      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                        {allSeasons.map((season) => {
                          const isOwned = owned.includes(season);
                          return (
                            <span
                              key={season}
                              title={isOwned ? `Season ${season}: owned` : `Season ${season}: not owned`}
                              className={`px-2 py-1.5 text-center text-sm font-medium border ${
                                isOwned
                                  ? "bg-indigo-600 border-indigo-500 text-white"
                                  : "bg-gray-800 border-gray-700 text-gray-500"
                              }`}
                            >
                              S{season}
                            </span>
                          );
                        })}
                      </div>
                    ) : owned.length > 0 ? (
                      <p className="text-white">
                        {formatSeasons(owned, show.totalSeasons)}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">None</p>
                    )}
                  </div>

                  {/* Purchases */}
                  <div className="p-4 border-b-[0.5px] border-white/20">
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-400">
                        Purchases
                      </h3>
                      {show.purchases.length > 0 && (
                        <span className="text-sm text-gray-300">
                          Total paid{" "}
                          <span className="font-mono text-green-400">
                            ${totalPaid(show.purchases).toFixed(2)}
                          </span>
                        </span>
                      )}
                    </div>
                    {show.purchases.length > 0 ? (
                      <div className="divide-y divide-white/10 border-[0.5px] border-white/20 rounded">
                        {show.purchases.map((purchase, idx) => {
                          const key = purchaseKey(purchase, idx);
                          return (
                            <div
                              key={key}
                              className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-3"
                            >
                              <div className="min-w-24">
                                <p className="text-white font-medium">
                                  {formatSeasons(purchase.seasons, show.totalSeasons) === "Complete"
                                    ? "Complete set"
                                    : formatSeasons(purchase.seasons, 0)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {formatPurchaseDate(purchase.purchasedAt)}
                                </p>
                              </div>
                              <p className="font-mono text-white min-w-16">
                                {purchase.price > 0 ? (
                                  `$${purchase.price.toFixed(2)}`
                                ) : (
                                  <span className="text-gray-500">No price</span>
                                )}
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                {[...purchase.formats].sort().map((fmt) => (
                                  <FormatIcon key={fmt} fmt={fmt} />
                                ))}
                              </div>
                              {purchase.condition && (
                                <span className="text-sm text-gray-300">
                                  {purchase.condition}
                                </span>
                              )}
                              <div className="flex items-center gap-3 ml-auto">
                                {purchase.upcNumber ? (
                                  <>
                                    <div className="relative inline-block">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            purchase.upcNumber,
                                          );
                                          setCopiedKey(key);
                                          setTimeout(() => setCopiedKey(null), 1500);
                                        }}
                                        title="Copy to clipboard"
                                        className="flex items-center gap-1 text-sm font-mono text-white cursor-pointer"
                                      >
                                        <FaBarcode />
                                        {purchase.upcNumber}
                                      </button>
                                      {copiedKey === key && (
                                        <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 text-green-400 text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                                          Copied!
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        const query = encodeURIComponent(
                                          purchase.upcNumber,
                                        );
                                        window.open(
                                          `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Sold=1&rt=nc&LH_ItemCondition=4`,
                                          "_blank",
                                          "noopener,noreferrer",
                                        );
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded-md transition duration-200 text-xs cursor-pointer"
                                    >
                                      Search eBay
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-500 text-sm flex items-center gap-1">
                                    <FaBarcode /> No UPC
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No purchases recorded</p>
                    )}
                    {show.productPosterPath && (
                      <img
                        src={show.productPosterPath}
                        alt={`${show.title} product`}
                        className="mt-4 rounded-lg shadow-md w-24 lg:w-32 h-auto object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>

                  <div className="flex p-4 border-b-[0.5px] border-white/20">
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Watched
                      </h3>
                      <p className="text-base text-white flex items-center gap-2">
                        {show.hasWatched ? (
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
                    <div className="w-1/2">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">
                        Streaming
                      </h3>
                      <p className="text-base text-white flex items-center gap-2">
                        {show.isOnPlex ? (
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
                </div>

                {/* Review and actions */}
                <div className="mb-8">
                  <div className="m-4 p-6 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">
                      Review / Notes
                    </h3>
                    {show.review ? (
                      <p className="text-white whitespace-pre-wrap">
                        {show.review}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">
                        No review or notes added
                      </p>
                    )}
                  </div>
                  {/* Tablet only; mobile and desktop show these near the top */}
                  <div className="hidden md:flex lg:hidden justify-center gap-2 mt-2">
                    {actionButtons}
                  </div>
                </div>
              </div>
            </div>

            {showEditModal && (
              <EditTvShowModal
                show={show}
                onClose={() => setShowEditModal(false)}
                onSaved={(updated) => {
                  setShow(updated);
                  setShowEditModal(false);
                }}
                onDeleted={() => navigate("/tv-shows")}
              />
            )}

            <ConfirmDialog
              isOpen={showDeleteConfirm}
              title="Delete TV Show"
              message={`Are you sure you want to delete ${show.title}? This action cannot be undone.`}
              confirmText="Delete"
              cancelText="Cancel"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TvShowDetail;
