import PosterCard from "./PosterCard";

interface CollectionCardProps {
  collection: {
    id: number | string;
    name: string;
  };
  // Shown as a ring on the poster; null hides it (no checklist, or turned off in Settings)
  completionPercentage: number | null;
  // Cover image, e.g. a poster from one of the collection's movies
  coverPath?: string;
  // Runs on a plain click (e.g. to open the collection's drawer); ctrl/cmd-clicks still follow the link
  onOpen?: () => void;
}

// A small circular progress ring with the percentage in the middle
function CompletionRing({ percent }: { percent: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(Math.max(percent, 0), 100) / 100) * circumference;

  return (
    <div
      role="img"
      className="relative size-9 rounded-full bg-black/70 shadow backdrop-blur-sm"
      title={`${percent}% complete`}
      aria-label={`${percent}% complete`}
    >
      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3" className="stroke-white/20" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="stroke-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
        {percent}%
      </span>
    </div>
  );
}

// A collection on the Collections page: the same card as the movie and TV poster views, with the
// completion ring in the corner and the name's first letter when there's no cover
function CollectionCard({ collection, completionPercentage, coverPath, onOpen }: CollectionCardProps) {
  return (
    <PosterCard
      title={collection.name}
      posterPath={coverPath ?? ""}
      to={`/collections?collection=${encodeURIComponent(collection.name)}`}
      onOpen={onOpen}
      fallback={
        <span className="text-4xl font-semibold text-muted-foreground/60">
          {collection.name.charAt(0).toUpperCase()}
        </span>
      }
      badge={completionPercentage !== null && <CompletionRing percent={completionPercentage} />}
    />
  );
}

export default CollectionCard;
