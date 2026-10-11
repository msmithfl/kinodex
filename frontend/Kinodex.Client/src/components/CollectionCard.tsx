import { Link } from "react-router-dom";

interface CollectionCardProps {
  collection: {
    id: number | string;
    name: string;
  };
  // Shown as a ring on the poster; null hides it (no checklist, or turned off in Settings)
  completionPercentage: number | null;
  // Cover image, e.g. a poster from one of the collection's movies
  coverPath?: string;
}

// A small circular progress ring with the percentage in the middle
function CompletionRing({ percent }: { percent: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(Math.max(percent, 0), 100) / 100) * circumference;

  return (
    <div
      className="relative w-9 h-9 rounded-full bg-gray-900/80 shadow"
      title={`${percent}% complete`}
      aria-label={`${percent}% complete`}
    >
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          className="stroke-gray-600"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="stroke-indigo-500 transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
        {percent}%
      </span>
    </div>
  );
}

// Poster-shaped collection card, styled like the movie list's poster view
function CollectionCard({
  collection,
  completionPercentage,
  coverPath,
}: CollectionCardProps) {
  return (
    <Link
      to={`/collections/${encodeURIComponent(collection.name)}`}
      className="group flex flex-col min-w-0"
    >
      {/* Hover: the outline turns indigo and a dark overlay fades in; no zoom */}
      <div className="relative aspect-2/3 rounded border border-white/20 overflow-hidden shadow-lg bg-gray-800 transition-colors duration-200 group-hover:border-indigo-500">
        {coverPath ? (
          <img
            src={coverPath}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-gray-600">
              {collection.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 pointer-events-none" />

        {/* Completion ring in the top-right corner, when the collection has a checklist */}
        {completionPercentage !== null && (
          <div className="absolute top-1.5 right-1.5">
            <CompletionRing percent={completionPercentage} />
          </div>
        )}
      </div>
      <h3
        className="mt-2 text-white text-xs md:text-sm font-semibold leading-tight truncate group-hover:underline"
        title={collection.name}
      >
        {collection.name}
      </h3>
    </Link>
  );
}

export default CollectionCard;
