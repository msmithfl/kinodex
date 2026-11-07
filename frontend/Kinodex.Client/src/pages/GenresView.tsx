import { Skeleton } from "@/components/ui/skeleton";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import GenreCard, { GENRE_OVERLAYS } from "../components/GenreCard";
import EmptyState from "../components/EmptyState";
import SubNavigation from "../components/SubNavigation";
import { useMovies } from "../features/movies/api";
import type { Movie } from "../types";

const GENRE_GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

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
        <div className="flex flex-col gap-4 bg-background px-6 pt-4 md:px-10 md:pt-7" aria-busy="true" aria-label="Loading genres">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className={GENRE_GRID}>
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl md:h-32" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      <div ref={viewportRef} className="flex h-[calc(100dvh-5rem)] flex-col bg-background" style={viewportStyle}>
        <div className="shrink-0 px-6 pt-4 pb-4 md:px-10 md:pt-7">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">Genres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {genres.length} {genres.length === 1 ? "genre" : "genres"}
          </p>
        </div>

        {/* Scrolls on its own; the small top inset keeps the hover ring and lift inside it */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-1 pb-8 md:px-10">
          {genres.length === 0 ? (
            <EmptyState message="No genres yet." />
          ) : (
            <div className={GENRE_GRID}>
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
