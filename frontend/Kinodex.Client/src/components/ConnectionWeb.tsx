import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import {
  FaLocationCrosshairs,
  FaMagnifyingGlassMinus,
  FaMagnifyingGlassPlus,
} from "react-icons/fa6";
import type { Movie } from "../types";
import {
  getMovieCredits,
  getPersonMovieCredits,
  type TMDBCredits,
  type TMDBPersonMovieCredit,
  type TMDBPersonMovieCredits,
} from "../utils/tmdbApi";

interface ConnectionWebProps {
  movies: Movie[];
  rootMovie: Movie;
  onSelectMovie: (movie: Movie) => void;
}

interface WorldPoint {
  x: number;
  y: number;
}

type Role = "director" | "writer";

interface PersonMeta {
  name: string;
  profilePath: string | null;
  role: Role;
}

interface GraphState {
  positions: Map<string, WorldPoint>;
  personMeta: Map<string, PersonMeta>;
  personMovies: Map<string, Set<number>>;
  expanded: Set<number>;
  issues: Map<number, "no-tmdb" | "no-credits">;
  islandCount: number;
}

interface Camera {
  panX: number;
  panY: number;
  zoom: number;
}

// One shared radius for both movie<->person hops, so every movie connected to a
// director or writer — including whichever one led us there — sits the same distance.
const HOP_DISTANCE = 300;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
const WORLD_LIMIT = 2600;
// A cluster can spread up to 2 * HOP_DISTANCE from its root in any direction, so
// islands need more than double that between their roots or two rings can end up
// overlapping and interleaving.
const ISLAND_GAP = 1600;

function movieKey(id: number) {
  return `m:${id}`;
}
function personKey(role: Role, id: number) {
  return `${role === "director" ? "d" : "w"}:${id}`;
}

function createGraphState(): GraphState {
  return {
    positions: new Map(),
    personMeta: new Map(),
    personMovies: new Map(),
    expanded: new Set(),
    issues: new Map(),
    islandCount: 0,
  };
}

// A movie picked out of the blue (unconnected to anything on the canvas so far) still
// needs a starting point. Rather than forcing it — and everything already placed — back
// to the origin, drop it as a new island past whatever's already out there. A fixed gap
// per island (rather than measuring current content) guarantees clearance even in the
// worst-case spread of an existing ring, so islands never overlap each other.
function nextIslandPosition(g: GraphState): WorldPoint {
  if (g.positions.size === 0) return { x: 0, y: 0 };
  g.islandCount += 1;
  return { x: g.islandCount * ISLAND_GAP, y: 0 };
}

function clampCamera(camera: Camera, viewportWidth: number, viewportHeight: number): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom));
  const minPanX = viewportWidth / 2 - WORLD_LIMIT * zoom;
  const maxPanX = viewportWidth / 2 + WORLD_LIMIT * zoom;
  const minPanY = viewportHeight / 2 - WORLD_LIMIT * zoom;
  const maxPanY = viewportHeight / 2 + WORLD_LIMIT * zoom;
  return {
    zoom,
    panX: Math.min(maxPanX, Math.max(minPanX, camera.panX)),
    panY: Math.min(maxPanY, Math.max(minPanY, camera.panY)),
  };
}

function ConnectionWeb({ movies, rootMovie, onSelectMovie }: ConnectionWebProps) {
  const graphRef = useRef<GraphState>(createGraphState());
  const [, bump] = useState(0);
  const forceRender = useCallback(() => bump((v) => v + 1), []);

  const moviesById = useMemo(() => {
    const map = new Map<number, Movie>();
    movies.forEach((m) => {
      if (m.id != null) map.set(m.id, m);
    });
    return map;
  }, [movies]);

  const [focusId, setFocusId] = useState<number>(rootMovie.id ?? 0);
  const [hoveredMovie, setHoveredMovie] = useState<Movie | null>(null);
  const [camera, setCamera] = useState<Camera>({ panX: 0, panY: 0, zoom: 1 });
  const [smooth, setSmooth] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startPan: { panX: number; panY: number };
  } | null>(null);
  const smoothTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const movieCreditsCache = useRef<Map<number, TMDBCredits | null>>(new Map());
  const personCreditsCache = useRef<Map<number, TMDBPersonMovieCredits | null>>(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const centerCameraOn = useCallback((pos: WorldPoint, animate: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    setCamera((prev) =>
      clampCamera(
        { panX: vw / 2 - pos.x * prev.zoom, panY: vh / 2 - pos.y * prev.zoom, zoom: prev.zoom },
        vw,
        vh,
      ),
    );
    if (animate) {
      setSmooth(true);
      if (smoothTimeoutRef.current) window.clearTimeout(smoothTimeoutRef.current);
      smoothTimeoutRef.current = window.setTimeout(() => setSmooth(false), 350);
    }
  }, []);

  const expandMovie = useCallback(
    async (movie: Movie) => {
      const g = graphRef.current;
      if (movie.id == null || g.expanded.has(movie.id)) return;
      const movieId = movie.id;
      g.expanded.add(movieId);

      if (!movie.tmdbId) {
        g.issues.set(movieId, "no-tmdb");
        forceRender();
        return;
      }

      let credits = movieCreditsCache.current.get(movie.tmdbId);
      if (credits === undefined) {
        credits = await getMovieCredits(movie.tmdbId);
        movieCreditsCache.current.set(movie.tmdbId, credits);
      }
      if (!mountedRef.current) return;

      const crew = credits?.crew || [];
      const director = crew.find((c) => c.job === "Director");
      const writer = crew.find((c) => c.department === "Writing");

      if (!director && !writer) {
        g.issues.set(movieId, "no-credits");
        forceRender();
        return;
      }
      g.issues.delete(movieId);

      const originKey = movieKey(movieId);
      const originPos = g.positions.get(originKey) ?? { x: 0, y: 0 };
      g.positions.set(originKey, originPos);

      // The director sits on one side of the movie, the writer directly opposite —
      // so the pairing reads clearly instead of the two competing for the same spot.
      let directorAngle = 0;
      if (director) {
        const dKey = personKey("director", director.id);
        const existing = g.positions.get(dKey);
        if (existing) {
          directorAngle = Math.atan2(existing.y - originPos.y, existing.x - originPos.x);
        } else {
          g.positions.set(dKey, {
            x: originPos.x + HOP_DISTANCE * Math.cos(directorAngle),
            y: originPos.y + HOP_DISTANCE * Math.sin(directorAngle),
          });
        }
        if (!g.personMeta.has(dKey)) {
          g.personMeta.set(dKey, {
            name: director.name,
            profilePath: director.profile_path,
            role: "director",
          });
        }
      }

      if (writer) {
        const wKey = personKey("writer", writer.id);
        if (!g.positions.has(wKey)) {
          const writerAngle = directorAngle + Math.PI;
          g.positions.set(wKey, {
            x: originPos.x + HOP_DISTANCE * Math.cos(writerAngle),
            y: originPos.y + HOP_DISTANCE * Math.sin(writerAngle),
          });
        }
        if (!g.personMeta.has(wKey)) {
          g.personMeta.set(wKey, {
            name: writer.name,
            profilePath: writer.profile_path,
            role: "writer",
          });
        }
      }

      // Sweeps in the rest of this person's owned-collection work and rings it evenly
      // around them. Same idea for both roles, so it's one routine parameterized by
      // which credit field identifies "did this person do that role on that film".
      const expandRing = async (
        role: Role,
        personId: number,
        matches: (c: TMDBPersonMovieCredit) => boolean,
      ) => {
        const pKey = personKey(role, personId);
        const personPos = g.positions.get(pKey)!;

        if (!g.personMovies.has(pKey)) g.personMovies.set(pKey, new Set());
        const movieSet = g.personMovies.get(pKey)!;
        movieSet.add(movieId);

        let personCredits = personCreditsCache.current.get(personId);
        if (personCredits === undefined) {
          personCredits = await getPersonMovieCredits(personId);
          personCreditsCache.current.set(personId, personCredits);
        }
        if (!mountedRef.current) return;

        const matchedTmdbIds = new Set(
          (personCredits?.crew || []).filter(matches).map((c) => c.id),
        );

        const connected = movies.filter(
          (m) => m.id !== movieId && m.tmdbId && matchedTmdbIds.has(m.tmdbId),
        );
        connected.forEach((cm) => {
          if (cm.id != null) movieSet.add(cm.id);
        });

        // Whichever of this person's films we haven't placed yet get divided evenly
        // around them. The movie that led us here already occupies a real angle from
        // this person — anchor the division to that angle instead of restarting from
        // 0°, or the new slots can land right on top of it instead of splitting the
        // circle evenly.
        const newMovies = connected.filter(
          (cm) => cm.id != null && !g.positions.has(movieKey(cm.id)),
        );
        const anchorAngle = Math.atan2(originPos.y - personPos.y, originPos.x - personPos.x);
        const total = movieSet.size;
        newMovies.forEach((cm, i) => {
          const angle = anchorAngle + ((i + 1) / total) * Math.PI * 2;
          g.positions.set(movieKey(cm.id!), {
            x: personPos.x + HOP_DISTANCE * Math.cos(angle),
            y: personPos.y + HOP_DISTANCE * Math.sin(angle),
          });
        });
      };

      if (director) {
        await expandRing("director", director.id, (c) => c.job === "Director");
        if (!mountedRef.current) return;
      }
      if (writer) {
        await expandRing("writer", writer.id, (c) => c.department === "Writing");
        if (!mountedRef.current) return;
      }

      forceRender();
    },
    [movies, forceRender],
  );

  // A movie already on the canvas just gets focused where it already sits; a brand-new
  // one is added as its own island, never disturbing what's already been placed.
  useEffect(() => {
    if (rootMovie.id == null) return;
    const g = graphRef.current;
    const key = movieKey(rootMovie.id);
    if (!g.positions.has(key)) {
      g.positions.set(key, nextIslandPosition(g));
    }
    setFocusId(rootMovie.id);
    setHoveredMovie(null);
    expandMovie(rootMovie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootMovie]);

  // Pan the camera to whichever movie is currently focused, wherever it actually sits.
  useEffect(() => {
    const pos = graphRef.current.positions.get(movieKey(focusId));
    if (pos) centerCameraOn(pos, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  // Drag to pan
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const el = containerRef.current;
      const drag = dragStateRef.current;
      if (!el || !drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setCamera((prev) =>
        clampCamera(
          { panX: drag.startPan.panX + dx, panY: drag.startPan.panY + dy, zoom: prev.zoom },
          el.clientWidth,
          el.clientHeight,
        ),
      );
    };
    const handleUp = () => {
      setIsDragging(false);
      dragStateRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  // Wheel-to-zoom, zoomed toward the cursor. Native listener so preventDefault actually works.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      setCamera((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * factor));
        const worldX = (cursorX - prev.panX) / prev.zoom;
        const worldY = (cursorY - prev.panY) / prev.zoom;
        return clampCamera(
          { panX: cursorX - worldX * newZoom, panY: cursorY - worldY * newZoom, zoom: newZoom },
          el.clientWidth,
          el.clientHeight,
        );
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    setCamera((prev) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * factor));
      const worldCenterX = (vw / 2 - prev.panX) / prev.zoom;
      const worldCenterY = (vh / 2 - prev.panY) / prev.zoom;
      return clampCamera(
        { panX: vw / 2 - worldCenterX * newZoom, panY: vh / 2 - worldCenterY * newZoom, zoom: newZoom },
        vw,
        vh,
      );
    });
    setSmooth(true);
    if (smoothTimeoutRef.current) window.clearTimeout(smoothTimeoutRef.current);
    smoothTimeoutRef.current = window.setTimeout(() => setSmooth(false), 250);
  };

  const handleSelectMovie = (movie: Movie) => {
    if (movie.id != null && graphRef.current.positions.has(movieKey(movie.id))) {
      setFocusId(movie.id);
      expandMovie(movie);
    }
    onSelectMovie(movie);
  };

  const graph = graphRef.current;
  const displayMovie = hoveredMovie ?? moviesById.get(focusId) ?? rootMovie;
  const focusIssue = graph.issues.get(focusId);

  const movieNodes: { movie: Movie; pos: WorldPoint }[] = [];
  const personNodes: { key: string; meta: PersonMeta; pos: WorldPoint }[] = [];
  graph.positions.forEach((pos, key) => {
    if (key.startsWith("m:")) {
      const id = Number(key.slice(2));
      const movie = moviesById.get(id);
      if (movie) movieNodes.push({ movie, pos });
    } else {
      const meta = graph.personMeta.get(key);
      if (meta) personNodes.push({ key, meta, pos });
    }
  });

  const edges: { key: string; a: WorldPoint; b: WorldPoint }[] = [];
  graph.personMovies.forEach((movieIds, pKey) => {
    const pPos = graph.positions.get(pKey);
    if (!pPos) return;
    movieIds.forEach((movieId) => {
      const mPos = graph.positions.get(movieKey(movieId));
      if (mPos) edges.push({ key: `${pKey}-${movieId}`, a: pPos, b: mPos });
    });
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        dragStateRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startPan: { panX: camera.panX, panY: camera.panY },
        };
        setIsDragging(true);
      }}
      className={`relative w-full h-full overflow-hidden bg-gray-900 select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
          transition: smooth ? "transform 300ms ease" : "none",
        }}
      >
        <svg
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
          width={1}
          height={1}
        >
          {edges.map((edge) => (
            <line
              key={edge.key}
              x1={edge.a.x}
              y1={edge.a.y}
              x2={edge.b.x}
              y2={edge.b.y}
              stroke="#4b5563"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {movieNodes.map(({ movie, pos }) => (
          <button
            key={movie.id}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => handleSelectMovie(movie)}
            onMouseEnter={() => setHoveredMovie(movie)}
            onMouseLeave={() => setHoveredMovie(null)}
            className="absolute w-16 cursor-pointer group"
            style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
          >
            <div
              className={`w-16 aspect-2/3 rounded overflow-hidden border shadow-md transition-transform duration-150 group-hover:scale-110 bg-gray-700 ${
                movie.id === focusId
                  ? "ring-4 ring-indigo-500 border-transparent shadow-indigo-500/30"
                  : "border-white/20 group-hover:border-indigo-400"
              }`}
            >
              {movie.posterPath ? (
                <img
                  src={movie.posterPath}
                  alt={`${movie.title} poster`}
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
                  {movie.title}
                </div>
              )}
            </div>
          </button>
        ))}

        {personNodes.map(({ key, meta, pos }) => (
          <div key={key}>
            {/* Avatar — centered exactly on the node's position, since edges point here */}
            <div
              className={`absolute w-16 h-16 rounded-full overflow-hidden border-2 bg-gray-700 shadow-md flex items-center justify-center ${
                meta.role === "director" ? "border-amber-400" : "border-emerald-400"
              }`}
              style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
            >
              {meta.profilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${meta.profilePath}`}
                  alt={meta.name}
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FaUserCircle className="w-10 h-10 text-gray-500" />
              )}
            </div>
            {/* Label — anchored below the avatar, doesn't affect where the edge lands */}
            <div
              className="absolute w-28 flex flex-col items-center gap-0.5 pointer-events-none"
              style={{ left: pos.x, top: pos.y + 40, transform: "translate(-50%, 0)" }}
            >
              <p className="text-white text-xs font-semibold text-center leading-tight">{meta.name}</p>
              <p
                className={`text-[10px] uppercase tracking-wide ${
                  meta.role === "director" ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {meta.role === "director" ? "Director" : "Writer"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Zoom / pan controls */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
        <button
          onClick={() => zoomBy(1.3)}
          aria-label="Zoom in"
          className="w-9 h-9 flex items-center justify-center bg-gray-800/90 backdrop-blur border border-gray-600 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
        >
          <FaMagnifyingGlassPlus className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomBy(0.77)}
          aria-label="Zoom out"
          className="w-9 h-9 flex items-center justify-center bg-gray-800/90 backdrop-blur border border-gray-600 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
        >
          <FaMagnifyingGlassMinus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const pos = graph.positions.get(movieKey(focusId));
            if (pos) centerCameraOn(pos, true);
          }}
          aria-label="Recenter on focused movie"
          className="w-9 h-9 flex items-center justify-center bg-gray-800/90 backdrop-blur border border-gray-600 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
        >
          <FaLocationCrosshairs className="w-4 h-4" />
        </button>
      </div>

      {/* Focused-movie issue banner */}
      {focusIssue && (
        <div className="absolute top-4 left-4 z-30 max-w-xs bg-gray-800/90 backdrop-blur border border-gray-600 rounded-md shadow-lg p-3">
          {focusIssue === "no-tmdb" ? (
            <>
              <p className="text-gray-300 text-sm">
                "{displayMovie.title}" isn't linked to TMDB yet, so its connections can't be
                mapped.
              </p>
              <Link to="/match-movies" className="text-indigo-400 hover:text-indigo-300 underline text-sm">
                Match it to TMDB
              </Link>
            </>
          ) : (
            <p className="text-gray-300 text-sm">
              No director or writer credit found for "{displayMovie.title}" on TMDB.
            </p>
          )}
        </div>
      )}

      {/* Movie details panel */}
      <div className="hidden sm:block absolute top-4 right-4 z-30 w-56 md:w-64 bg-gray-800/90 backdrop-blur border border-gray-600 rounded-md shadow-lg p-4">
        <div className="flex gap-3">
          <div className="w-14 aspect-2/3 rounded overflow-hidden shrink-0 bg-gray-700">
            {displayMovie.posterPath ? (
              <img
                src={displayMovie.posterPath}
                alt={`${displayMovie.title} poster`}
                draggable={false}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
              {displayMovie.title}
            </p>
            {displayMovie.year && (
              <p className="text-gray-400 text-xs mt-0.5">{displayMovie.year}</p>
            )}
            {displayMovie.formats && displayMovie.formats.length > 0 && (
              <p className="text-gray-400 text-xs mt-1">{displayMovie.formats.join(", ")}</p>
            )}
            {displayMovie.genres && displayMovie.genres.length > 0 && (
              <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                {displayMovie.genres.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectionWeb;
