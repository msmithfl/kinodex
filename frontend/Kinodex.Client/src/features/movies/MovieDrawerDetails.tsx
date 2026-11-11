import { Link } from "react-router-dom";
import { Barcode, Check, Copy, ExternalLink, Eye, EyeOff, Gift, MonitorOff, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openEbaySoldListings, useCopyToClipboard } from "../../utils/upc";
import { formatPurchaseDate } from "../../utils/dateUtils";
import Fact, { NotSet, YesNo } from "../../components/DetailField";
import type { Movie } from "../../types";
import { handOverDrawer } from "../../utils/windowHandoff";

interface MovieDrawerDetailsProps {
  movie: Movie;
  onEnlargeProductImage: () => void;
}

const notSet = <NotSet />;

const card = "rounded-xl border border-border bg-card";

// The movie drawer's details, in the order they were laid out: format and condition, the purchase,
// the disc (product shot, barcode, eBay), where it lives, watched and streaming, then collections
// and notes
function MovieDrawerDetails({ movie, onEnlargeProductImage }: MovieDrawerDetailsProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-3 px-5 pt-6 pb-8 md:px-8">
      {/* The copy and the purchase */}
      <dl className={cn(card, "grid grid-cols-3 gap-x-4 gap-y-4 p-4")}>
        <Fact label="Format">
          {movie.formats.length > 0 ? (
            <span className="flex gap-1">
              {[...movie.formats].sort().map((fmt) => (
                <Badge key={fmt} variant="outline" className="font-normal">
                  {fmt}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </Fact>
        <Fact label="Condition">{movie.condition || notSet}</Fact>

        <Fact label="Paid" rowStart>
          {movie.purchasePrice > 0 ? (
            <span className="font-mono tabular-nums">${movie.purchasePrice.toFixed(2)}</span>
          ) : (
            notSet
          )}
        </Fact>
        <Fact label="Purchased">{movie.purchasedAt ? formatPurchaseDate(movie.purchasedAt) : notSet}</Fact>
        <Fact label="Gift">
          <YesNo yes={movie.isGift} on={<Gift />} off={<Gift />} />
        </Fact>
      </dl>

      {/* The disc: product shot, barcode (click to copy) and an eBay sold-listings search */}
      <div className={cn(card, "flex items-center gap-3 p-3")}>
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
              className="h-14 w-auto rounded-md bg-white object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </button>
        )}
        {movie.upcNumber ? (
          <button
            type="button"
            onClick={() => copy(movie.upcNumber)}
            title="Copy the UPC"
            className="group flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 font-mono text-sm hover:bg-accent"
          >
            <Barcode className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{movie.upcNumber}</span>
            {copied ? (
              <Check className="size-3.5 shrink-0 text-success" aria-label="Copied" />
            ) : (
              <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </button>
        ) : (
          <span className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
            <Barcode className="size-4 shrink-0" /> No UPC
          </span>
        )}
        {movie.upcNumber && (
          <Button variant="secondary" size="sm" onClick={() => openEbaySoldListings(movie.upcNumber)} className="ml-auto">
            eBay sold
            <ExternalLink />
          </Button>
        )}
      </div>

      {/* Where it lives; watched and streaming */}
      <dl className={cn(card, "grid grid-cols-3 gap-x-4 gap-y-4 p-4")}>
        <Fact label="Shelf">
          {movie.shelfSection || "Unshelved"}
        </Fact>
        <Fact label="Shelf #">
          {movie.shelfNumber > 0 ? <span className="font-mono tabular-nums">{movie.shelfNumber}</span> : notSet}
        </Fact>
        <Fact label="HDD #">
          {movie.hdDriveNumber > 0 ? <span className="font-mono tabular-nums">{movie.hdDriveNumber}</span> : notSet}
        </Fact>

        <Fact label="Watched" rowStart>
          <YesNo yes={movie.hasWatched} on={<Eye />} off={<EyeOff />} />
        </Fact>
        <Fact label="Streaming">
          <YesNo yes={movie.isStreaming} on={<MonitorPlay />} off={<MonitorOff />} />
        </Fact>
      </dl>

      {/* Collections, as links that open each one's drawer */}
      <section className="flex flex-col gap-2 pt-2">
        <h3 className="text-xs text-muted-foreground">Collections</h3>
        {movie.collections.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {movie.collections.map((col) => (
              <Link
                key={col}
                to={`/collections?collection=${encodeURIComponent(col)}`}
                // The collection's drawer takes over this drawer's backdrop, so it doesn't flash
                onClick={(e) => handOverDrawer(e.currentTarget)}
                className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 text-xs transition-colors hover:bg-accent"
              >
                {col}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None</p>
        )}
      </section>

      {/* Review / notes */}
      <section className={cn(card, "mt-1 flex flex-col gap-1.5 p-4")}>
        <h3 className="text-xs text-muted-foreground">Review / notes</h3>
        {movie.review ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{movie.review}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No review or notes added</p>
        )}
      </section>
    </div>
  );
}

export default MovieDrawerDetails;
