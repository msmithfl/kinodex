import { useState } from "react";
import { FaBarcode } from "react-icons/fa6";
import { LuGift } from "react-icons/lu";
import DetailField from "../../components/DetailField";
import { FormatIcon } from "../../utils/formatIcon";
import { formatSeasons } from "../../utils/formatSeasons";
import { purchaseKey, totalPaid } from "../../utils/tvShowPurchases";
import { formatPurchaseDate } from "../../utils/dateUtils";
import { openEbaySoldListings } from "../../utils/upc";
import type { TvShow } from "../../types";

const notSet = <span className="text-gray-500">Not set</span>;

// The show's purchases, one card each, laid out like the movie drawer's details: which seasons,
// then Format | Condition, Paid | Purchased | Gift, and the UPC (click to copy) with an eBay
// sold-listings search. The total paid sits in the header.
function TvShowPurchaseList({ show }: { show: TvShow }) {
  // Which purchase's UPC was just copied, for the "Copied!" hint
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyUpc = (upc: string, key: string) => {
    navigator.clipboard.writeText(upc);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Purchases</h3>
        {show.purchases.length > 0 && (
          <span className="text-xs text-gray-400">
            Total paid{" "}
            <span className="font-mono text-sm text-green-400">
              ${totalPaid(show.purchases).toFixed(2)}
            </span>
          </span>
        )}
      </div>
      {show.purchases.length > 0 ? (
        <div className="flex flex-col gap-3">
          {show.purchases.map((purchase, idx) => {
            const key = purchaseKey(purchase, idx);
            return (
              <div key={key} className="p-3 rounded-lg bg-gray-800/60 border border-white/10">
                <p className="text-sm font-medium text-white mb-2">
                  {formatSeasons(purchase.seasons, show.totalSeasons) === "Complete"
                    ? "Complete set"
                    : formatSeasons(purchase.seasons, 0)}
                </p>

                <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <DetailField label="Format">
                    {purchase.formats.length > 0 ? (
                      <span className="flex flex-wrap gap-2">
                        {[...purchase.formats].sort().map((fmt) => (
                          <FormatIcon key={fmt} fmt={fmt} />
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </DetailField>
                  <DetailField label="Condition">{purchase.condition || notSet}</DetailField>

                  <DetailField label="Paid" rowStart>
                    {purchase.price > 0 ? (
                      <span className="font-mono">${purchase.price.toFixed(2)}</span>
                    ) : (
                      notSet
                    )}
                  </DetailField>
                  <DetailField label="Purchased">
                    {purchase.purchasedAt ? formatPurchaseDate(purchase.purchasedAt) : notSet}
                  </DetailField>
                  <DetailField label="Gift">
                    <span className="flex items-center gap-1.5">
                      <LuGift className={`w-4 h-4 ${purchase.isGift ? "" : "text-gray-500"}`} />
                      {purchase.isGift ? "Yes" : "No"}
                    </span>
                  </DetailField>
                </dl>

                {/* The disc: barcode (click to copy) and an eBay sold-listings search */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                  <div className="relative min-w-0">
                    {purchase.upcNumber ? (
                      <button
                        onClick={() => copyUpc(purchase.upcNumber, key)}
                        title="Copy to clipboard"
                        className="flex items-center gap-1.5 font-mono text-sm text-white hover:text-indigo-300 cursor-pointer"
                      >
                        <FaBarcode className="shrink-0" />
                        <span className="truncate">{purchase.upcNumber}</span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <FaBarcode className="shrink-0" /> No UPC
                      </span>
                    )}
                    {copiedKey === key && (
                      <span className="absolute top-full mt-1 left-0 bg-gray-900 text-green-400 text-xs font-medium px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </div>
                  {purchase.upcNumber && (
                    <button
                      onClick={() => openEbaySoldListings(purchase.upcNumber)}
                      className="ml-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-md transition duration-200 text-xs cursor-pointer"
                    >
                      Search eBay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No purchases recorded</p>
      )}
    </div>
  );
}

export default TvShowPurchaseList;
