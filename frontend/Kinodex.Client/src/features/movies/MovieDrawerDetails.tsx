import { Link } from "react-router-dom";
import { Eye, EyeOff, MonitorOff, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import Fact, { YesNo } from "../../components/DetailField";
import CopyCards from "../../components/CopyCards";
import type { Movie } from "../../types";
import { handOverDrawer } from "../../utils/windowHandoff";
interface MovieDrawerDetailsProps {
  movie: Movie;
  onEnlargeProductImage: (src: string) => void; // A copy's product image
}

const card = "rounded-xl border border-border bg-card";

// The movie drawer's details: its copies (format, condition, the purchase, where it lives, the disc
// with its product shot, barcode and eBay), watched and streaming, then collections and notes
function MovieDrawerDetails({ movie, onEnlargeProductImage }: MovieDrawerDetailsProps) {
  return (
    <div className="flex flex-col gap-3 px-5 pt-6 pb-8 md:px-8">
      <CopyCards copies={movie.copies} onEnlargeProductImage={onEnlargeProductImage} />

      {/* Watched and streaming */}
      <dl className={cn(card, "grid grid-cols-3 gap-x-4 gap-y-4 p-4")}>
        <Fact label="Watched">
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
