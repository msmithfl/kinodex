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

function CollectionCard({
  collection,
  movieCount,
  completionPercentage,
  urlPath,
  poster = false,
  coverPath,
}: CollectionCardProps) {
  if (poster) {
    const details = [
      `${movieCount} movie${movieCount !== 1 ? "s" : ""}`,
      completionPercentage !== null ? `${completionPercentage}% complete` : null,
    ]
      .filter(Boolean)
      .join(" · ");

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

          <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow">
            {movieCount}
          </span>

          {/* Completion along the bottom edge, when the collection has a checklist */}
          {completionPercentage !== null && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gray-900/70">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          )}
        </div>
        <h3
          className="mt-2 text-white text-xs md:text-sm font-semibold leading-tight truncate group-hover:underline"
          title={collection.name}
        >
          {collection.name}
        </h3>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{details}</p>
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
