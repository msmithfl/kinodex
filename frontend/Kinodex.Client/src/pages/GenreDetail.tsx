import { useState, useEffect } from "react";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useAuth } from "@clerk/clerk-react";
import { useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import MovieDetailCard from "../components/MovieCardDetail";
import MoviePosterCard from "../components/MovieCardPoster";
//import Counter from '../components/Counter'
import LoadingSpinner from "../components/LoadingSpinner";
import ViewToggle from "../components/ViewToggle";
import { DETAIL_VIEW_OPTIONS } from "../utils/viewOptions";
import SubNavigation from "../components/SubNavigation";
import type { Movie } from "../types";

function GenreDetail() {
  const { getToken } = useAuth();
  const { genreName } = useParams<{ genreName: string }>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  // Fills the screen below the header and above the mobile bottom bar
  const viewport = useFillViewportHeight<HTMLDivElement>([loading]);

  // View mode state
  const [viewMode, setViewMode] = useState<"detail" | "poster">(() => {
    const saved = localStorage.getItem("movieViewMode");
    return saved === "poster" || saved === "detail" ? saved : "detail";
  });
  const handleViewModeChange = (mode: "detail" | "poster") => {
    setViewMode(mode);
    localStorage.setItem("movieViewMode", mode);
  };

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const MOVIES_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchMovies();
  }, [genreName]);

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
      <div ref={viewport.ref} className="flex h-[calc(100dvh-9rem)] mt-2" style={viewport.style}>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-12">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold mb-2">{genreName}</h1>
              {/* <Counter count={movies.length} className="mb-2" /> */}
              <div className="ml-auto mb-2">
                <ViewToggle
                  value={viewMode}
                  options={DETAIL_VIEW_OPTIONS}
                  onChange={handleViewModeChange}
                />
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
