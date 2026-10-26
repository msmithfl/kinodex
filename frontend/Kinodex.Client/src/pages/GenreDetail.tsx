import { useState } from "react";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import SimpleMovieTable from "../components/SimpleMovieTable";
import MoviePosterCard from "../components/MovieCardPoster";
import Counter from "../components/Counter";
import LoadingSpinner from "../components/LoadingSpinner";
import ViewToggle from "../components/ViewToggle";
import { TABLE_VIEW_OPTIONS } from "../utils/viewOptions";
import SubNavigation from "../components/SubNavigation";
import Drawer from "../components/Drawer";
import MovieDetail from "./MovieDetail";
import { useDrawerParam } from "../utils/useDrawerParam";
import { useMovies } from "../features/movies/api";

function GenreDetail() {
  const { genreName } = useParams<{ genreName: string }>();
  const { data: allMovies = [], isLoading: loading } = useMovies();
  const movies = allMovies.filter((movie) => movie.genres?.includes(genreName || ""));
  // Fills the screen below the header and above the mobile bottom bar
  const { ref: viewportRef, style: viewportStyle } = useFillViewportHeight<HTMLDivElement>([loading]);
  // The movie open in the side drawer (?movie=)
  const { openId: openMovieId, open: openMovie, close: closeMovie } = useDrawerParam("movie");

  // A table like the Movies and TV Shows lists, or a poster grid
  const [viewMode, setViewMode] = useState<"table" | "poster">(() => {
    try {
      return localStorage.getItem("genreViewMode") === "poster" ? "poster" : "table";
    } catch {
      return "table";
    }
  });
  const handleViewModeChange = (mode: "table" | "poster") => {
    setViewMode(mode);
    try {
      localStorage.setItem("genreViewMode", mode);
    } catch {
      // Storage unavailable; the choice just isn't remembered
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
      {openMovieId && (
        <Drawer label="Movie details" onClose={closeMovie}>
          <MovieDetail key={openMovieId} movieId={openMovieId} onDeleted={closeMovie} />
        </Drawer>
      )}
      <div ref={viewportRef} className="flex h-[calc(100dvh-9rem)] mt-2" style={viewportStyle}>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-12">
          <div>
            <h1 className="text-3xl font-bold">{genreName}</h1>
            {/* The movie count, with the view toggle on the same line */}
            <div className="flex items-center justify-between gap-4 mt-1 mb-3">
              <Counter count={movies.length} />
              <ViewToggle
                value={viewMode}
                options={TABLE_VIEW_OPTIONS}
                onChange={handleViewModeChange}
              />
            </div>
          </div>

          {/* Movies Section */}
          <div>
            {movies.length === 0 ? (
              <EmptyState message="No movies in this genre yet." />
            ) : viewMode === "poster" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-8">
                {movies.map((movie) => (
                  <MoviePosterCard
                    key={movie.id}
                    movie={movie}
                    captionBelow
                    onOpen={() => openMovie(movie.id)}
                  />
                ))}
              </div>
            ) : (
              <SimpleMovieTable movies={movies} onOpen={openMovie} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default GenreDetail;
