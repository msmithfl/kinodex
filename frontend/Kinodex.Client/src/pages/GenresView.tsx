import { useState, useEffect } from "react";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useAuth } from "@clerk/clerk-react";
import GenreCard, { GENRE_OVERLAYS } from "../components/GenreCard";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import type { Movie } from "../types";

function GenresView() {
  const { getToken } = useAuth();
  const [genres, setGenres] = useState<string[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  // Fills the screen below the header and above the mobile bottom bar
  const viewport = useFillViewportHeight<HTMLDivElement>([loading]);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const MOVIES_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const moviesRes = await fetch(MOVIES_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  // Artwork for each genre's card: the highest-rated movie in it with an image, skipping movies
  // already used for an earlier genre so the same film doesn't repeat. Wide backdrops suit the
  // wide cards, so they're preferred over posters.
  const genreImages: Record<string, string | undefined> = {};
  const usedMovieIds = new Set<number | undefined>();
  const imageOf = (m: Movie) => m.backdropPath || m.posterPath;
  for (const genre of genres) {
    const candidates = movies
      .filter((m) => m.genres?.includes(genre) && imageOf(m))
      .sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title));
    const pick = candidates.find((m) => !usedMovieIds.has(m.id)) ?? candidates[0];
    if (pick) {
      usedMovieIds.add(pick.id);
      genreImages[genre] = imageOf(pick);
    }
  }

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
      <div ref={viewport.ref} className="flex h-[calc(100dvh-9rem)] pt-2" style={viewport.style}>
        <div className="flex-1 min-h-0 overflow-y-auto px-8 pt-2">
          {genres.length === 0 ? (
            <EmptyState message="No genres yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {genres.map((genre, index) => (
                <GenreCard
                  key={genre}
                  name={genre}
                  movieCount={getMovieCount(genre)}
                  imagePath={genreImages[genre]}
                  overlay={GENRE_OVERLAYS[index % GENRE_OVERLAYS.length]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default GenresView;
