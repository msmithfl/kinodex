import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import MovieDetailCard from "../components/MovieCardDetail";
import MoviePosterCard from "../components/MovieCardPoster";
//import Counter from '../components/Counter'
import LoadingSpinner from "../components/LoadingSpinner";
import { FaCheck, FaImage } from "react-icons/fa";
import { FaTableList, FaChevronDown, FaChevronUp } from "react-icons/fa6";
import SubNavigation from "../components/SubNavigation";
import type { Movie } from "../types";

function GenreDetail() {
  const { getToken } = useAuth();
  const { genreName } = useParams<{ genreName: string }>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode state
  const [viewMode, setViewMode] = useState<"detail" | "poster">(() => {
    const saved = localStorage.getItem("movieViewMode");
    return saved === "poster" || saved === "detail" ? saved : "detail";
  });
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  const handleViewModeChange = (mode: "detail" | "poster") => {
    setViewMode(mode);
    localStorage.setItem("movieViewMode", mode);
    setIsViewDropdownOpen(false);
  };

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const MOVIES_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchMovies();
  }, [genreName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        viewDropdownRef.current &&
        !viewDropdownRef.current.contains(event.target as Node)
      ) {
        setIsViewDropdownOpen(false);
      }
    };

    if (isViewDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isViewDropdownOpen]);

  const fetchMovies = async () => {
    try {
      const token = await getToken();
      const moviesRes = await fetch(MOVIES_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (moviesRes.ok) {
        const data = await moviesRes.json();
        const filtered = data.filter(
          (movie: Movie) =>
            movie.genres && movie.genres.includes(genreName || ""),
        );
        setMovies(filtered);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      <div className="flex h-[calc(100vh-9rem)] mt-2">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-12">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold mb-2">{genreName}</h1>
              {/* <Counter count={movies.length} className="mb-2" /> */}
              <div ref={viewDropdownRef} className="ml-auto relative mb-2">
                <button
                  onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                >
                  {viewMode === "poster" ? (
                    <FaImage className="w-5 h-5" />
                  ) : (
                    <FaTableList className="w-5 h-5" />
                  )}
                  {isViewDropdownOpen ? (
                    <FaChevronUp className="w-3 h-3" />
                  ) : (
                    <FaChevronDown className="w-3 h-3" />
                  )}
                </button>
                {isViewDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => handleViewModeChange("poster")}
                      className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors flex items-center justify-between border-b border-gray-600 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span>Poster View</span>
                      </div>
                      {viewMode === "poster" && (
                        <FaCheck className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <button
                      onClick={() => handleViewModeChange("detail")}
                      className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span>Detail View</span>
                      </div>
                      {viewMode === "detail" && (
                        <FaCheck className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Movies Section */}
          <div>
            {movies.length === 0 ? (
              <EmptyState message="No movies in this genre yet." />
            ) : (
              <div
                className={
                  viewMode === "poster"
                    ? "grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-1.5 md:gap-y-10"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
                }
              >
                {movies.map((movie) =>
                  viewMode === "poster" ? (
                    <MoviePosterCard key={movie.id} movie={movie} />
                  ) : (
                    <MovieDetailCard key={movie.id} movie={movie} showYear />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default GenreDetail;
