import { useState } from "react";
import { FaBarcode } from "react-icons/fa6";
import { FormatIcon } from "../../utils/formatIcon";
import { formatSeasons } from "../../utils/formatSeasons";
import { purchaseKey, totalPaid } from "../../utils/tvShowPurchases";
import { formatPurchaseDate } from "../../utils/dateUtils";
import { openEbaySoldListings } from "../../utils/upc";
import type { TvShow } from "../../types";

// The show's purchases, one row each: which seasons, when, price, formats, condition, and the
// UPC (click to copy) with an eBay sold-listings search. The total paid sits in the header, and
// the product image (if any) below the list.
function TvShowPurchaseList({ show }: { show: TvShow }) {
  // Which purchase's UPC was just copied, for the "Copied!" hint
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyUpc = (upc: string, key: string) => {
    navigator.clipboard.writeText(upc);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="p-4 border-b-[0.5px] border-white/20">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Purchases</h3>
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
              <div key={key} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-3">
                <div className="min-w-24">
                  <p className="text-white font-medium">
                    {formatSeasons(purchase.seasons, show.totalSeasons) === "Complete"
                      ? "Complete set"
                      : formatSeasons(purchase.seasons, 0)}
                  </p>
                  <p className="text-xs text-gray-400">{formatPurchaseDate(purchase.purchasedAt)}</p>
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
                  <span className="text-sm text-gray-300">{purchase.condition}</span>
                )}
                <div className="flex items-center gap-3 ml-auto">
                  {purchase.upcNumber ? (
                    <>
                      <div className="relative inline-block">
                        <button
                          onClick={() => copyUpc(purchase.upcNumber, key)}
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
                        onClick={() => openEbaySoldListings(purchase.upcNumber)}
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
  );
}

export default TvShowPurchaseList;
