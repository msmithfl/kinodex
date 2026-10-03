import { useEffect, useRef, useState } from "react";
import { FaArrowRight } from "react-icons/fa";

// The fields the results list shows, whatever kind of TMDB result it is
export interface TmdbSearchOption {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD release or first air date, may be empty
  posterPath: string | null;
}

interface TmdbSearchStepProps<T> {
  search: (query: string, year: string) => Promise<T[]>;
  toOption: (item: T) => TmdbSearchOption;
  onSelect: (item: T) => void;
  onManualEntry: () => void;
  placeholder: string;
}

function TmdbSearchStep<T>({
  search,
  toOption,
  onSelect,
  onManualEntry,
  placeholder,
}: TmdbSearchStepProps<T>) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Wait 300ms after the user stops typing before searching
  const scheduleSearch = (nextQuery: string, nextYear: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (nextQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        setResults(await search(nextQuery, nextYear));
        setShowResults(true);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      }
    }, 300);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    scheduleSearch(value, year);
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    scheduleSearch(query, value);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex gap-4 px-6 justify-between bg-gray-800 py-2">
        <p className="text-white pl-2">Search By Title</p>
        <button
          onClick={onManualEntry}
          className="text-white pl-2 hover:underline cursor-pointer"
        >
          Manual Entry <FaArrowRight className="inline-block w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-col flex-1 bg-gray-800 min-h-0">
        <div className="flex px-6 gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="px-4 py-3 w-full bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            placeholder="Year (optional)"
            className="px-4 py-3 w-full bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={4}
          />
        </div>
        <div className="flex flex-col flex-1 min-h-0 px-6 py-2">
          {showResults && results.length > 0 && (
            <div className="w-full flex-1 overflow-y-auto">
              {results.map((item) => {
                const option = toOption(item);
                return (
                  <button
                    key={option.id}
                    onClick={() => onSelect(item)}
                    className="w-full px-4 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                  >
                    <div className="flex items-center gap-4">
                      {option.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${option.posterPath}`}
                          alt={option.title}
                          className="w-12 h-18 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-18 bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{option.title}</p>
                        <p className="text-gray-400 text-sm">
                          {option.date ? option.date.split("-")[0] : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TmdbSearchStep;
