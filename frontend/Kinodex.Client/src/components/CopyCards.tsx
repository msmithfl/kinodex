import { useState } from "react";
import { Barcode, Check, Copy as CopyIcon, ExternalLink, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DetailField, { NotSet, YesNo } from "./DetailField";
import { copyKey, seasonsTitle, totalPaid } from "../utils/copies";
import { formatPurchaseDate } from "../utils/dateUtils";
import { openEbaySoldListings } from "../utils/upc";
import type { Copy } from "../types";

interface CopyCardsProps {
  copies: Copy[];
  // A show's season count: each card is named by its seasons. Left out for a movie.
  totalSeasons?: number;
  onEnlargeProductImage: (src: string) => void;
}

// A movie's or show's copies in its drawer, one card each: (a show's) seasons, the disc (its
// product image (click to enlarge), the UPC (click to copy) and an eBay sold-listings search),
// then Format | Condition, Paid | Purchased | Gift, Shelf | Shelf # | HDD #. With more than one
// copy (or any for a show), the total paid sits in the header.
function CopyCards({ copies, totalSeasons, onEnlargeProductImage }: CopyCardsProps) {
  const isShow = totalSeasons !== undefined;
  // Which copy's UPC was just copied, for the tick
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyUpc = (upc: string, key: string) => {
    navigator.clipboard.writeText(upc);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs text-muted-foreground">{copies.length === 1 ? "Copy" : "Copies"}</h3>
        {(isShow ? copies.length > 0 : copies.length > 1) && (
          <span className="text-xs text-muted-foreground">
            Total paid{" "}
            <span className="font-mono text-sm text-foreground tabular-nums">${totalPaid(copies).toFixed(2)}</span>
          </span>
        )}
      </div>
      {copies.length > 0 ? (
        <div className="flex flex-col gap-3">
          {copies.map((copy, idx) => {
            const key = copyKey(copy, idx);
            const name = isShow ? seasonsTitle(copy, totalSeasons) : null;
            return (
              <div key={key} className="rounded-xl border border-border bg-card">
                {name && <p className="px-4 pt-3 text-sm font-medium">{name}</p>}

                {/* The disc: product image (click to enlarge), barcode (click to copy) and an eBay
                    sold-listings search */}
                <div className={`flex items-center gap-3 border-b border-border px-3 ${name ? "pt-1.5 pb-2.5" : "py-2.5"}`}>
                  {copy.productPosterPath && (
                    <button
                      type="button"
                      onClick={() => onEnlargeProductImage(copy.productPosterPath)}
                      className="shrink-0 cursor-zoom-in"
                      aria-label={`Enlarge the ${name ?? `copy ${idx + 1}`} product image`}
                    >
                      <img
                        src={copy.productPosterPath}
                        alt=""
                        className="h-10 w-auto rounded-sm bg-white object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </button>
                  )}
                  {copy.upcNumber ? (
                    <button
                      type="button"
                      onClick={() => copyUpc(copy.upcNumber, key)}
                      title="Copy the UPC"
                      className="group flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 font-mono text-sm hover:bg-accent"
                    >
                      <Barcode className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{copy.upcNumber}</span>
                      {copiedKey === key ? (
                        <Check className="size-3.5 shrink-0 text-success" aria-label="Copied" />
                      ) : (
                        <CopyIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
                      <Barcode className="size-4 shrink-0" /> No UPC
                    </span>
                  )}
                  {copy.upcNumber && (
                    <Button variant="secondary" size="sm" onClick={() => openEbaySoldListings(copy.upcNumber)} className="ml-auto">
                      eBay sold
                      <ExternalLink />
                    </Button>
                  )}
                </div>

                <dl className="grid grid-cols-3 gap-x-4 gap-y-4 p-4">
                  <DetailField label="Format">
                    {copy.formats.length > 0 ? (
                      <span className="flex gap-1">
                        {[...copy.formats].sort().map((fmt) => (
                          <Badge key={fmt} variant="outline" className="font-normal">
                            {fmt}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </DetailField>
                  <DetailField label="Condition">{copy.condition || <NotSet />}</DetailField>

                  <DetailField label="Paid" rowStart>
                    {copy.price > 0 ? <span className="font-mono tabular-nums">${copy.price.toFixed(2)}</span> : <NotSet />}
                  </DetailField>
                  <DetailField label="Purchased">
                    {copy.purchasedAt ? formatPurchaseDate(copy.purchasedAt) : <NotSet />}
                  </DetailField>
                  <DetailField label="Gift">
                    <YesNo yes={copy.isGift} on={<Gift />} off={<Gift />} />
                  </DetailField>

                  <DetailField label="Shelf" rowStart>
                    {copy.shelfSection || "Unshelved"}
                  </DetailField>
                  <DetailField label="Shelf #">
                    {copy.shelfNumber > 0 ? <span className="font-mono tabular-nums">{copy.shelfNumber}</span> : <NotSet />}
                  </DetailField>
                  <DetailField label="HDD #">
                    {copy.hdDriveNumber > 0 ? <span className="font-mono tabular-nums">{copy.hdDriveNumber}</span> : <NotSet />}
                  </DetailField>
                </dl>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No copies recorded</p>
      )}
    </section>
  );
}

export default CopyCards;
