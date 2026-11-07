import { useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import ListSkeleton from "../components/ListSkeleton";
import PageHeader from "../components/PageHeader";
import PageShell from "../components/PageShell";
import PosterCard from "../components/PosterCard";
import SimpleMovieTable from "../components/SimpleMovieTable";
import SubNavigation from "../components/SubNavigation";
import ViewModeToggle, { VIEW_MODES, type ViewMode } from "../components/ViewModeToggle";
import { POSTER_GRID_CAPTIONED } from "../components/posterGrid";
import Drawer from "../components/Drawer";
import MovieDetail from "../features/movies/MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useStoredChoice } from "../utils/useStoredState";
import { useMovies } from "../features/movies/api";

function GenreDetail() {
  const { genreName } = useParams<{ genreName: string }>();
  const { data: allMovies = [], isLoading: loading } = useMovies();
  const movies = allMovies.filter((movie) => movie.genres?.includes(genreName || ""));
  // The movie open in the side drawer (?movie=)
  const { openId: openMovieId, open: openMovie, close: closeMovie } = useDrawerParam("movie");

  // A table like the Movies and TV Shows lists, or a poster grid; remembered in this browser
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>("genreViewMode", VIEW_MODES, "table");

  if (loading) {
    return (
      <>
        <SubNavigation />
        <ListSkeleton viewMode={viewMode} toolbar={false} grid={POSTER_GRID_CAPTIONED} label="Loading genre" />
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie}>
          <MovieDetail key={openMovieId} movieId={openMovieId} onDeleted={closeMovie} />
        </Drawer>
      )}
      <PageShell deps={[loading]}>
        <PageHeader
          title={genreName}
          subtitle={`${movies.length} ${movies.length === 1 ? "movie" : "movies"}`}
          actions={<ViewModeToggle value={viewMode} onChange={setViewMode} showLabels />}
          className="shrink-0 px-6 pt-4 pb-4 md:px-10 md:pt-7"
        />

        {/* Scrolls on its own; the small top inset keeps the hover ring and lift inside it */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-8 md:px-10">
          {movies.length === 0 ? (
            <EmptyState message="No movies in this genre yet." />
          ) : viewMode === "poster" ? (
            <div className={POSTER_GRID_CAPTIONED}>
              {movies.map((movie) => (
                <PosterCard
                  key={movie.id}
                  title={movie.title}
                  posterPath={movie.posterPath}
                  subtitle={movie.year ? String(movie.year) : undefined}
                  formats={movie.formats}
                  rating={movie.rating}
                  to={`/library?movie=${movie.id}`}
                  onOpen={() => openMovie(movie.id)}
                />
              ))}
            </div>
          ) : (
            <SimpleMovieTable movies={movies} onOpen={openMovie} />
          )}
        </div>
      </PageShell>
    </>
  );
}

export default GenreDetail;
