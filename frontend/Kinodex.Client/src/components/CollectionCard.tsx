import { Link } from "react-router-dom";

interface CollectionCardProps {
  collection: {
    id: number | string;
    name: string;
  };
  movieCount: number;
  completionPercentage: number | null;
  urlPath: string;
}

function CollectionCard({
  collection,
  movieCount,
  completionPercentage,
  urlPath,
}: CollectionCardProps) {
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
