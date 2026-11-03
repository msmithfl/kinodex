import { useState } from "react";
import { Barcode, Check, Copy, ExternalLink, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DetailField, { NotSet, YesNo } from "../../components/DetailField";
import { formatSeasons } from "../../utils/formatSeasons";
import { purchaseKey, totalPaid } from "../../utils/tvShowPurchases";
import { formatPurchaseDate } from "../../utils/dateUtils";
import { openEbaySoldListings } from "../../utils/upc";
import type { TvShow } from "../../types";

// The show's purchases, one card each, laid out like the movie drawer's details: which seasons,
// then Format | Condition, Paid | Purchased | Gift, and the UPC (click to copy) with an eBay
// sold-listings search. The total paid sits in the header.
function TvShowPurchaseList({ show }: { show: TvShow }) {
  // Which purchase's UPC was just copied, for the tick
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyUpc = (upc: string, key: string) => {
    navigator.clipboard.writeText(upc);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs text-muted-foreground">Purchases</h3>
        {show.purchases.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Total paid{" "}
            <span className="font-mono text-sm text-foreground tabular-nums">
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
              <div key={key} className="rounded-xl border border-border bg-card">
                <p className="px-4 pt-3 text-sm font-medium">
                  {formatSeasons(purchase.seasons, show.totalSeasons) === "Complete"
                    ? "Complete set"
                    : formatSeasons(purchase.seasons, 0)}
                </p>

                <dl className="grid grid-cols-3 gap-x-4 gap-y-4 px-4 pt-3 pb-4">
                  <DetailField label="Format">
                    {purchase.formats.length > 0 ? (
                      <span className="flex gap-1">
                        {[...purchase.formats].sort().map((fmt) => (
                          <Badge key={fmt} variant="outline" className="font-normal">
                            {fmt}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </DetailField>
                  <DetailField label="Condition">{purchase.condition || <NotSet />}</DetailField>

                  <DetailField label="Paid" rowStart>
                    {purchase.price > 0 ? (
                      <span className="font-mono tabular-nums">${purchase.price.toFixed(2)}</span>
                    ) : (
                      <NotSet />
                    )}
                  </DetailField>
                  <DetailField label="Purchased">
                    {purchase.purchasedAt ? formatPurchaseDate(purchase.purchasedAt) : <NotSet />}
                  </DetailField>
                  <DetailField label="Gift">
                    <YesNo yes={purchase.isGift} on={<Gift />} off={<Gift />} />
                  </DetailField>
                </dl>

                {/* The disc: barcode (click to copy) and an eBay sold-listings search */}
                <div className="flex items-center gap-3 border-t border-border px-3 py-2.5">
                  {purchase.upcNumber ? (
                    <button
                      type="button"
                      onClick={() => copyUpc(purchase.upcNumber, key)}
                      title="Copy the UPC"
                      className="group flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 font-mono text-sm hover:bg-accent"
                    >
                      <Barcode className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{purchase.upcNumber}</span>
                      {copiedKey === key ? (
                        <Check className="size-3.5 shrink-0 text-green-400" aria-label="Copied" />
                      ) : (
                        <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
                      <Barcode className="size-4 shrink-0" /> No UPC
                    </span>
                  )}
                  {purchase.upcNumber && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEbaySoldListings(purchase.upcNumber)}
                      className="ml-auto"
                    >
                      eBay sold
                      <ExternalLink />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No purchases recorded</p>
      )}
    </section>
  );
}

export default TvShowPurchaseList;
