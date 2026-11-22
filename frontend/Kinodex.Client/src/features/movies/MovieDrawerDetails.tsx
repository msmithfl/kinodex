import { Eye, EyeOff, MonitorOff, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import Fact, { YesNo } from "../../components/DetailField";
import CopyCards from "../../components/CopyCards";
import CollectionLinks from "../../components/CollectionLinks";
import type { Movie } from "../../types";
interface MovieDrawerDetailsProps {
  movie: Movie;
  onEnlargeProductImage: (src: string) => void; // A copy's product image
}

const card = "rounded-xl border border-border bg-card";

// The movie drawer's details: its collections, its copies (the disc with its product shot, barcode
// and eBay, then format, condition, the purchase, where it lives), watched and streaming, then notes
function MovieDrawerDetails({ movie, onEnlargeProductImage }: MovieDrawerDetailsProps) {
  return (
    <div className="flex flex-col gap-3 px-5 pt-6 pb-8 md:px-8">
      <CollectionLinks collections={movie.collections} />
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
