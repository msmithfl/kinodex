import { Link } from "react-router-dom";

interface CollectionCardProps {
  collection: {
    id: number | string;
    name: string;
  };
  movieCount: number;
  completionPercentage: number | null;
  urlPath: string;
  // Poster-shaped card, styled like the movie list's poster view
  poster?: boolean;
  // Cover image for the poster layout, e.g. a poster from one of the collection's movies
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

function CollectionCard({
  collection,
  movieCount,
  completionPercentage,
  urlPath,
  poster = false,
  coverPath,
}: CollectionCardProps) {
  if (poster) {
    return (
      <Link
        to={`/${urlPath}/${encodeURIComponent(collection.name)}`}
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

  return (
    <Link
      to={`/${urlPath}/${encodeURIComponent(collection.name)}`}
      className="bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg pt-6 transition-all duration-200 transform hover:scale-105"
    >
      <div className="flex items-start justify-between mb-4 mx-6">
        <div className="flex-1 max-w-64 md:max-w-50">
          <h3 className="text-xl font-bold text-white mb-2 truncate">
            {collection.name}
          </h3>
        </div>
        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          {movieCount}
        </span>
      </div>
      {completionPercentage !== null && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1 mx-6">
            <span
              className={`text-xs font-semibold ${completionPercentage === 100 ? "text-indigo-400" : "text-indigo-400"}`}
            >
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-b-full h-2">
            <div
              className={`h-2 rounded-b-full transition-all duration-300 ${
                completionPercentage === 100 ? "bg-indigo-500" : "bg-indigo-500"
              }`}
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      )}
    </Link>
  );
}

export default CollectionCard;
