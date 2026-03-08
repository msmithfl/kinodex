import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import SubNavigation from "../components/SubNavigation";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Movie } from "../types";

const SPINE_COLORS = [
  "bg-blue-800",
  "bg-indigo-800",
  "bg-purple-800",
  "bg-teal-800",
  "bg-cyan-800",
  "bg-slate-700",
  "bg-blue-900",
  "bg-violet-800",
  "bg-sky-800",
  "bg-emerald-900",
];

function getSpineColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++)
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

type FormatTier = "4k" | "bluray" | "dvd" | "vhs" | "other";

function getFormatTier(formats: string[]): FormatTier {
  const f = formats.map((s) => s.toLowerCase());
  if (f.some((s) => s.includes("4k") || s.includes("uhd"))) return "4k";
  if (f.some((s) => s.includes("blu"))) return "bluray";
  if (f.some((s) => s.includes("dvd"))) return "dvd";
  if (f.some((s) => s.includes("vhs"))) return "vhs";
  return "other";
}

const PER_ROW = 40;

function MyShelf() {
  const { getToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE}/api/movies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data: Movie[] = await response.json();
          setMovies(
            [...data]
              .filter((m) => m.shelfSection && m.shelfSection !== "Unshelved")
              .sort((a, b) => a.title.localeCompare(b.title)),
          );
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  const rows: Movie[][] = [];
  for (let i = 0; i < movies.length; i += PER_ROW) {
    rows.push(movies.slice(i, i + PER_ROW));
  }

  return (
    <>
      <SubNavigation />
      <div className="flex flex-col h-[calc(100vh-9rem)] pt-2">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 md:px-10 pb-8">
          <div className="space-y-8">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx}>
                {/* Spine row — align to bottom so DVD spines stick up above the rest */}
                <div className="flex items-end justify-center gap-0.5 min-w-max">
                  {row.map((movie) => {
                    const tier = getFormatTier(movie.formats ?? []);
                    const isDvd = tier === "dvd";
                    const isVhs = tier === "vhs";
                    const spineHeight = isDvd || isVhs ? 185 : 160;

                    const notchColor =
                      tier === "4k"
                        ? "#111111"
                        : tier === "bluray"
                          ? "#1d4ed8"
                          : tier === "dvd"
                            ? "#242322"
                            : tier === "vhs"
                              ? "#4b5563"
                              : "#374151";

                    return (
                      <Link
                        key={movie.id}
                        to={`/movie/${movie.id}`}
                        title={`${movie.title}${tier !== "other" ? ` (${tier === "bluray" ? "Blu-ray" : tier.toUpperCase()})` : ""}`}
                        style={{
                          width: `${tier === "vhs" ? "40px" : "20px"}`,
                          height: `${spineHeight + 30}px`,
                        }}
                        className={`group relative flex flex-col ${tier === "vhs" ? "" : "rounded-md"} ${getSpineColor(movie.title)} hover:brightness-125 hover:-translate-y-1 translate-y-1.5 transition-all duration-150 cursor-pointer`}
                      >
                        {/* Format notch */}
                        <div
                          className={`${tier === "vhs" ? "hidden" : ""} w-full rounded-t-sm shrink-0`}
                          style={{
                            height: `${tier === "dvd" ? "10px" : "20px"}`,
                            backgroundColor: notchColor,
                          }}
                        />
                        {/* Spine body with title */}
                        <div
                          className="relative shrink-0 flex items-center justify-center overflow-hidden"
                          style={{
                            height: `${spineHeight + (tier === "dvd" ? 10 : 0)}px`,
                          }}
                        >
                          <span
                            className="text-white font-semibold select-none whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{
                              writingMode: "vertical-rl",
                              fontSize: "clamp(7px, 1.8vw, 13px)",
                              maxHeight: `${spineHeight - 40}px`,
                              lineHeight: 1.1,
                            }}
                          >
                            {movie.title}
                          </span>
                        </div>
                        <div
                          className={`${tier === "vhs" ? "hidden" : ""} w-full rounded-b-sm shrink-0`}
                          style={{
                            height: "10px",
                            backgroundColor: notchColor,
                          }}
                        />
                        {/* VHS spool — half circle at bottom */}
                        {tier === "vhs" && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                            <div
                              style={{
                                width: "30px",
                                height: "14px",
                                backgroundColor: "#000",
                                borderRadius: "14px 14px 0 0",
                              }}
                            />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
                {/* Shelf plank */}
                <div
                  className={`h-4 rounded bg-linear-to-b from-amber-700 to-amber-900 shadow-lg w-xl md:w-full`}
                />
                <div className="h-2 rounded-b bg-amber-950 shadow-md w-xl md:w-full" />
              </div>
            ))}
          </div>

          {movies.length === 0 && (
            <p className="text-center text-gray-500 mt-20">
              No movies in your collection yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default MyShelf;
