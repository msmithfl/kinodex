import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import GenreCard, { GENRE_OVERLAYS } from "../components/GenreCard";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import SubNavigation from "../components/SubNavigation";
import { useMovies } from "../features/movies/api";
import type { Movie } from "../types";

function GenresView() {
  // Genres have no table of their own: they're whatever genres the user's movies have
  const { data: movies = [], isLoading: loading } = useMovies();
  const genres = Array.from(new Set(movies.flatMap((movie) => movie.genres ?? []))).sort();
  // Fills the screen below the header and above the mobile bottom bar
  const { ref: viewportRef, style: viewportStyle } = useFillViewportHeight<HTMLDivElement>([loading]);

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
      <div ref={viewportRef} className="flex h-[calc(100dvh-9rem)] pt-2" style={viewportStyle}>
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
