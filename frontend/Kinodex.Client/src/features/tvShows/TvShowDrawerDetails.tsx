import { Eye, EyeOff, MonitorOff, MonitorPlay } from "lucide-react";
import DetailField, { YesNo } from "../../components/DetailField";
import TvShowSeasons from "./TvShowSeasons";
import TvShowPurchaseList from "./TvShowPurchaseList";
import type { TvShow } from "../../types";

interface TvShowDrawerDetailsProps {
  show: TvShow;
  onEnlargeProductImage: (src: string) => void; // A purchase's product image
}

// The TV show drawer's details, laid out like the movie drawer's: seasons owned, each purchase
// (format, condition, price, date, gift, product image, barcode), watched and streaming, then
// notes
function TvShowDrawerDetails({ show, onEnlargeProductImage }: TvShowDrawerDetailsProps) {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-8 md:px-8">
      <TvShowSeasons show={show} />
      <TvShowPurchaseList show={show} onEnlargeProductImage={onEnlargeProductImage} />

      <dl className="grid grid-cols-3 gap-x-4 gap-y-4 rounded-xl border border-border bg-card p-4">
        <DetailField label="Watched">
          <YesNo yes={show.hasWatched} on={<Eye />} off={<EyeOff />} />
        </DetailField>
        <DetailField label="Streaming">
          <YesNo yes={show.isStreaming} on={<MonitorPlay />} off={<MonitorOff />} />
        </DetailField>
      </dl>

      {/* Review / notes */}
      <section className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs text-muted-foreground">Review / notes</h3>
        {show.review ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{show.review}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No review or notes added</p>
        )}
      </section>
    </div>
  );
}

export default TvShowDrawerDetails;
