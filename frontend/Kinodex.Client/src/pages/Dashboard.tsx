import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Movie } from "../types";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import {
  FaFilm,
  FaDownload,
  FaChartPie,
  FaPlus,
} from "react-icons/fa";
import { AddMovieModal } from "../components/AddMovieModal";

interface Stats {
  total: number;
  dvd: number;
  bluray: number;
  fourK: number;
  thisMonth: MonthSpend;
  lastMonth: MonthSpend;
}

interface MonthSpend {
  label: string;
  spend: number;
  count: number;
}

// On mobile each card is a third of the row (less the gaps), so three fit and the rest scroll;
// on desktop all four share the row
const quickActionClass =
  "shrink-0 snap-start w-[calc((100%-1.5rem)/3)] md:w-auto md:flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg p-3 md:p-8 transition-all duration-200 transform hover:scale-105 text-center";

// Total purchase price of movies added in the given calendar month
function getMonthSpend(movies: Movie[], monthStart: Date): MonthSpend {
  const added = movies.filter((m) => {
    if (!m.createdAt) return false;
    const date = new Date(m.createdAt);
    return (
      date.getFullYear() === monthStart.getFullYear() &&
      date.getMonth() === monthStart.getMonth()
    );
  });
  return {
    label: monthStart.toLocaleString("default", { month: "long" }),
    spend: added.reduce((sum, m) => sum + (m.purchasePrice || 0), 0),
    count: added.length,
  };
}

function Dashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    dvd: 0,
    bluray: 0,
    fourK: 0,
    thisMonth: { label: "", spend: 0, count: 0 },
    lastMonth: { label: "", spend: 0, count: 0 },
  });
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  // Size the page to the viewport so Recently Added scrolls instead of running off screen
  const container = useFillViewportHeight<HTMLDivElement>();

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const movies: Movie[] = await response.json();

        const now = new Date();

        // Calculate stats - count by highest format (first alphabetically)
        const stats = {
          total: movies.length,
          dvd: movies.filter((m) => {
            const highestFormat =
              m.formats.length > 0 ? [...m.formats].sort()[0] : "";
            return highestFormat === "DVD";
          }).length,
          bluray: movies.filter((m) => {
            const highestFormat =
              m.formats.length > 0 ? [...m.formats].sort()[0] : "";
            return highestFormat === "Blu-ray";
          }).length,
          fourK: movies.filter((m) => {
            const highestFormat =
              m.formats.length > 0 ? [...m.formats].sort()[0] : "";
            return highestFormat === "4K";
          }).length,
          thisMonth: getMonthSpend(
            movies,
            new Date(now.getFullYear(), now.getMonth()),
          ),
          lastMonth: getMonthSpend(
            movies,
            new Date(now.getFullYear(), now.getMonth() - 1),
          ),
        };
        setStats(stats);

        // Get 5 most recent movies
        const recent = movies
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          })
          .slice(0, 10);
        setRecentMovies(recent);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={container.ref}
      className="flex h-[calc(100dvh-5rem)] pt-2"
      style={container.style}
    >
      <div className="flex-1 flex flex-col min-h-0 mx-auto px-8 w-full max-w-7xl">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-4 md:mt-6 mb-3 md:mb-6">
              <div className="bg-linear-to-br from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200 text-xs md:text-sm font-medium">
                      Total Movies
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-white mt-1 md:mt-2">
                      {stats.total}
                    </p>
                  </div>
                  <div className="text-3xl md:text-5xl">🎬</div>
                </div>
              </div>

              <div className="bg-linear-to-br from-purple-600 to-purple-700 rounded-lg shadow-lg p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-xs md:text-sm font-medium">
                      DVD
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-white mt-1 md:mt-2">
                      {stats.dvd}
                    </p>
                  </div>
                  <div className="text-3xl md:text-5xl">💿</div>
                </div>
              </div>

              <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-xs md:text-sm font-medium">
                      Blu-ray
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-white mt-1 md:mt-2">
                      {stats.bluray}
                    </p>
                  </div>
                  <div className="text-3xl md:text-5xl">📀</div>
                </div>
              </div>

              <div className="bg-linear-to-br from-cyan-600 to-cyan-700 rounded-lg shadow-lg p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-200 text-xs md:text-sm font-medium">
                      4K Ultra HD
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-white mt-1 md:mt-2">
                      {stats.fourK}
                    </p>
                  </div>
                  <div className="text-3xl md:text-5xl">💎</div>
                </div>
              </div>
            </div>

            {/* Spending This Month and Last Month */}
            <div className="bg-linear-to-br from-green-600 to-green-700 rounded-lg shadow-lg p-3 md:p-6 mb-6 md:mb-12">
              <div className="grid grid-cols-2 divide-x divide-green-500">
                {[
                  { title: "This Month", month: stats.thisMonth },
                  { title: "Last Month", month: stats.lastMonth },
                ].map(({ title, month }, idx) => (
                  <div key={idx} className={idx === 0 ? "pr-3 md:pr-6" : "pl-3 md:pl-6"}>
                    <p className="text-white text-sm md:text-base font-semibold">
                      {title}
                    </p>
                    <p className="text-green-200 text-xs md:text-sm font-medium">
                      {month.label}
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-white mt-1 md:mt-2">
                      ${month.spend.toFixed(2)}
                    </p>
                    {/* <p className="text-green-200 text-xs md:text-sm mt-1">
                      {month.count} movie{month.count !== 1 ? "s" : ""} added
                    </p> */}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 md:mb-12">
              {/* Mobile: three cards fit across and the rest scroll. Desktop: all fit, no scrolling. Padding leaves room for the hover scale. */}
              <div className="flex gap-3 md:gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none scroll-px-2 -m-2 p-2">
                <Link
                  to="/library"
                  className={quickActionClass}
                >
                  <div className="h-6 md:h-12 mb-2 md:mb-4 flex items-center justify-center">
                    <FaFilm className="text-xl md:text-5xl" />
                  </div>
                  <h3 className="text-sm md:text-xl font-semibold leading-tight md:mb-2">Library</h3>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className={`${quickActionClass} cursor-pointer`}
                >
                  <div className="h-6 md:h-12 mb-2 md:mb-4 flex items-center justify-center">
                    <FaPlus className="text-2xl md:text-5xl" />
                  </div>
                  <h3 className="text-sm md:text-xl font-semibold leading-tight md:mb-2">Add</h3>
                </button>

                <Link
                  to="/stats"
                  className={quickActionClass}
                >
                  <div className="h-6 md:h-12 mb-2 md:mb-4 flex items-center justify-center">
                    <FaChartPie className="text-2xl md:text-5xl" />
                  </div>
                  <h3 className="text-sm md:text-xl font-semibold leading-tight md:mb-2">Stats</h3>
                </Link>
                <Link
                  to="/export"
                  className={quickActionClass}
                >
                  <div className="h-6 md:h-12 mb-2 md:mb-4 flex items-center justify-center">
                    <FaDownload className="text-2xl md:text-5xl" />
                  </div>
                  <h3 className="text-sm md:text-xl font-semibold leading-tight md:mb-2">CSV</h3>
                </Link>
              </div>
            </div>

            {/* Recently Added */}
            {recentMovies.length > 0 && (
              <div className="flex-1 min-h-48 flex flex-col pb-4 md:pb-8">
                <div className="shrink-0 flex justify-between items-center mb-3 md:mb-6">
                  <h2 className="text-2xl font-bold">Recently Added</h2>
                  <Link
                    to="/library"
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                <div className="min-h-0 bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
                  <div className="divide-y divide-gray-700">
                    {recentMovies.map((movie) => (
                      <Link
                        key={movie.id}
                        to={`/movie/${movie.id}`}
                        className="flex items-center justify-between p-4 hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <h3
                            className="text-lg font-semibold text-white truncate max-w-sm"
                            title={movie.title}
                          >
                            {movie.title}
                          </h3>
                          {movie.formats && movie.formats.length > 0 ? (
                            <span className="inline-flex gap-1 whitespace-nowrap">
                              {[...movie.formats].sort().map((fmt, idx) => (
                                <span
                                  key={idx}
                                  className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                                >
                                  {fmt}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </div>
                        <div className="text-gray-400">→</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showAddModal && (
        <AddMovieModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default Dashboard;
