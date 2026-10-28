import { LuEye, LuEyeClosed } from "react-icons/lu";
import { HiSignal, HiOutlineSignalSlash } from "react-icons/hi2";
import DetailField from "../../components/DetailField";
import TvShowSeasons from "./TvShowSeasons";
import TvShowPurchaseList from "./TvShowPurchaseList";
import type { TvShow } from "../../types";

interface TvShowDrawerDetailsProps {
  show: TvShow;
  onEnlargeProductImage: () => void;
}

// The TV show drawer's details, laid out like the movie drawer's: seasons owned, each purchase
// (format, condition, price, date, gift, barcode), the product image, watched and streaming,
// then notes
function TvShowDrawerDetails({ show, onEnlargeProductImage }: TvShowDrawerDetailsProps) {
  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <TvShowSeasons show={show} />
      <TvShowPurchaseList show={show} />

      {/* The product shot (box art), click to enlarge */}
      {show.productPosterPath && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 border border-white/10">
          <button
            type="button"
            onClick={onEnlargeProductImage}
            className="shrink-0 cursor-zoom-in"
            aria-label={`Enlarge the ${show.title} product image`}
          >
            <img
              src={show.productPosterPath}
              alt={`${show.title} product`}
              className="h-14 w-auto rounded shadow object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </button>
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Product</span>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
        <DetailField label="Watched">
          <span className="flex items-center gap-1.5">
            {show.hasWatched ? (
              <>
                <LuEye className="w-4 h-4" /> Yes
              </>
            ) : (
              <>
                <LuEyeClosed className="w-4 h-4" /> No
              </>
            )}
          </span>
        </DetailField>
        <DetailField label="Streaming">
          <span className="flex items-center gap-1.5">
            {show.isStreaming ? (
              <>
                <HiSignal className="w-4 h-4" /> Yes
              </>
            ) : (
              <>
                <HiOutlineSignalSlash className="w-4 h-4" /> No
              </>
            )}
          </span>
        </DetailField>
      </dl>

      {/* Review / notes */}
      <div className="p-3 rounded-lg bg-gray-800/60 border border-white/10">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Review / Notes
        </h3>
        {show.review ? (
          <p className="mt-1 text-sm text-white whitespace-pre-wrap">{show.review}</p>
        ) : (
          <p className="mt-1 text-sm text-gray-500 italic">No review or notes added</p>
        )}
      </div>
    </div>
  );
}

export default TvShowDrawerDetails;
