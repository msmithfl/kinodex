import { useState, useEffect } from "react";
import CollectionCard from "../components/CollectionCard";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import type { Movie } from "../types";

function GenresView() {
  const [genres, setGenres] = useState<string[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const MOVIES_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const moviesRes = await fetch(MOVIES_URL);

      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        setMovies(moviesData);

        // Extract unique genres from all movies
        const uniqueGenres = new Set<string>();
        moviesData.forEach((movie: Movie) => {
          if (movie.genres && movie.genres.length > 0) {
            movie.genres.forEach((genre) => uniqueGenres.add(genre));
          }
        });

        setGenres(Array.from(uniqueGenres).sort());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMovieCount = (genreName: string) => {
    return movies.filter(
      (movie) => movie.genres && movie.genres.includes(genreName),
    ).length;
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
      <div className="flex h-[calc(100vh-9rem)] pt-2">
        <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-2">
          {genres.length === 0 ? (
            <EmptyState message="No genres yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {genres.map((genre) => {
                const movieCount = getMovieCount(genre);
                return (
                  <CollectionCard
                    key={genre}
                    collection={{ id: 0, name: genre }}
                    movieCount={movieCount}
                    completionPercentage={null}
                    urlPath="genres"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default GenresView;
