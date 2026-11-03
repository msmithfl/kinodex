import { cn } from "@/lib/utils";
import { formatSeasons } from "../../utils/formatSeasons";
import { ownedSeasons, ownsEverySeason } from "../../utils/tvShowPurchases";
import type { TvShow } from "../../types";

// The show's seasons as a grid of S1, S2, ... tiles, owned ones highlighted. Without a known
// season count, it lists the owned seasons as text instead.
function TvShowSeasons({ show }: { show: TvShow }) {
  const owned = ownedSeasons(show.purchases);
  const allSeasons = Array.from({ length: show.totalSeasons }, (_, i) => i + 1);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs text-muted-foreground">Seasons owned</h3>
        {show.totalSeasons > 0 && (
          <span className="text-xs text-muted-foreground">
            {ownsEverySeason(show) ? "Complete series" : `${owned.length} of ${show.totalSeasons}`}
          </span>
        )}
      </div>
      {show.totalSeasons > 0 ? (
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
          {allSeasons.map((season) => {
            const isOwned = owned.includes(season);
            return (
              <span
                key={season}
                title={isOwned ? `Season ${season}: owned` : `Season ${season}: not owned`}
                className={cn(
                  "rounded-md border py-1.5 text-center text-sm font-medium tabular-nums",
                  isOwned ? "border-primary/50 bg-primary-soft text-primary-text" : "border-border text-muted-foreground",
                )}
              >
                S{season}
              </span>
            );
          })}
        </div>
      ) : owned.length > 0 ? (
        <p className="text-sm">{formatSeasons(owned, show.totalSeasons)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </section>
  );
}

export default TvShowSeasons;
