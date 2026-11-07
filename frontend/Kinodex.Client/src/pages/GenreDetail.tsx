import { useState } from "react";
import { useParams } from "react-router-dom";
import { LayoutGrid, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import EmptyState from "../components/EmptyState";
import ListSkeleton from "../components/ListSkeleton";
import PosterCard from "../components/PosterCard";
import SimpleMovieTable from "../components/SimpleMovieTable";
import SubNavigation from "../components/SubNavigation";
import Drawer from "../components/Drawer";
import MovieDetail from "../features/movies/MovieDetail";
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
        <ListSkeleton viewMode={viewMode} label="Loading genre" />
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
      <div ref={viewportRef} className="flex h-[calc(100dvh-5rem)] flex-col bg-background" style={viewportStyle}>
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-4 px-6 pt-4 pb-4 md:px-10 md:pt-7">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{genreName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {movies.length} {movies.length === 1 ? "movie" : "movies"}
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(mode) => mode && handleViewModeChange(mode as "table" | "poster")}
            aria-label="View"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <Table2 />
              <span className="hidden lg:inline">Table</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="poster" aria-label="Poster view">
              <LayoutGrid />
              <span className="hidden lg:inline">Posters</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Scrolls on its own; the small top inset keeps the hover ring and lift inside it */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-8 md:px-10">
          {movies.length === 0 ? (
            <EmptyState message="No movies in this genre yet." />
          ) : viewMode === "poster" ? (
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 md:grid-cols-4 md:gap-x-4 md:gap-y-7 lg:grid-cols-5 xl:grid-cols-8">
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
      </div>
    </>
  );
}

export default GenreDetail;
