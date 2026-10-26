import { formatSeasons } from "../../utils/formatSeasons";
import { ownedSeasons, ownsEverySeason } from "../../utils/tvShowPurchases";
import type { TvShow } from "../../types";

// The show's seasons as a grid of S1, S2, ... tiles, owned ones highlighted. Without a known
// season count, it lists the owned seasons as text instead.
function TvShowSeasons({ show }: { show: TvShow }) {
  const owned = ownedSeasons(show.purchases);
  const allSeasons = Array.from({ length: show.totalSeasons }, (_, i) => i + 1);

  return (
    <div className="p-4 border-b-[0.5px] border-white/20">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">Seasons Owned</h3>
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
        <p className="text-white">{formatSeasons(owned, show.totalSeasons)}</p>
      ) : (
        <p className="text-gray-500 italic">None</p>
      )}
    </div>
  );
}

export default TvShowSeasons;
