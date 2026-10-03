import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate, useParams } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ConnectionWeb from "../components/ConnectionWeb";
import type { Movie } from "../types";

function Kinodes() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { movieId } = useParams<{ movieId: string }>();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const token = await getToken();
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data: Movie[] = await response.json();
          setMovies(data);
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const centerMovie = useMemo(() => {
    if (!movieId) return null;
    return movies.find((m) => String(m.id) === movieId) || null;
  }, [movies, movieId]);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return movies.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, movies]);

  const handleSelectMovie = (movie: Movie) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(`/kinodes/${movie.id}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative h-[calc(100vh-5rem)] w-full overflow-hidden">
      {/* Full-bleed node area */}
      <div className="absolute inset-0">
        {!centerMovie ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState message="Search above and select a movie to see its connections." />
          </div>
        ) : (
          <ConnectionWeb
            movies={movies}
            rootMovie={centerMovie}
            onSelectMovie={handleSelectMovie}
          />
        )}
      </div>

      {/* Search bar, overlaid top-center */}
      <div
        ref={searchRef}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4"
      >
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder={
              centerMovie
                ? "Search to jump to a different movie..."
                : "Search your collection to start exploring..."
            }
            className="w-full px-4 py-3 pl-10 bg-gray-800/90 backdrop-blur border border-gray-600 rounded-md text-white placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute z-20 w-full mt-2 bg-gray-800/95 backdrop-blur border border-gray-600 rounded-md shadow-lg max-h-96 overflow-y-auto">
            {searchResults.map((movie) => (
              <button
                key={movie.id}
                onClick={() => handleSelectMovie(movie)}
                className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 flex items-center gap-4 cursor-pointer"
              >
                {movie.posterPath ? (
                  <img
                    src={movie.posterPath}
                    alt={`${movie.title} poster`}
                    className="w-10 h-15 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-15 bg-gray-600 rounded flex items-center justify-center text-gray-400 text-[10px] text-center">
                    No Image
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{movie.title}</p>
                  <p className="text-gray-400 text-sm">{movie.year}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Kinodes;
