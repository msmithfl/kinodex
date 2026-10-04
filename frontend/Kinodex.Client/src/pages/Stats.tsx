import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Movie, TvShow } from "../types";
import ChartCard from "../components/ChartCard";
import { allFormats } from "../utils/tvShowPurchases";
import { movieSpend, tvSpend } from "../utils/spending";

type Scope = "all" | "movies" | "tv";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movies", label: "Movies" },
  { id: "tv", label: "TV Shows" },
];

// The fields the charts read, shared by movies and TV shows
interface StatItem {
  kind: "movie" | "tv";
  rating: number;
  hasWatched: boolean;
  isOnPlex: boolean;
  year: number;
  genres: string[];
  formats: string[];
  conditions: string[]; // A movie has one; a TV show has one per purchase
}

const movieItem = (m: Movie): StatItem => ({
  kind: "movie",
  rating: m.rating,
  hasWatched: m.hasWatched,
  isOnPlex: m.isOnPlex,
  year: m.year,
  genres: m.genres,
  formats: m.formats,
  conditions: m.condition ? [m.condition] : [],
});

const tvItem = (s: TvShow): StatItem => ({
  kind: "tv",
  rating: s.rating,
  hasWatched: s.hasWatched,
  isOnPlex: s.isOnPlex,
  year: s.year,
  genres: s.genres,
  formats: allFormats(s.purchases),
  conditions: s.purchases.map((p) => p.condition).filter(Boolean),
});

function Stats() {
  const { getToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<TvShow[]>([]);
  const [scope, setScope] = useState<Scope>(() => {
    const saved = localStorage.getItem("statsScope");
    return saved === "movies" || saved === "tv" ? saved : "all";
  });
  const [startMonth, setStartMonth] = useState(
    () => localStorage.getItem("statsMonthlySpendStart") || "",
  );
  const [endMonth, setEndMonth] = useState(
    () => localStorage.getItem("statsMonthlySpendEnd") || "",
  );
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

  useEffect(() => {
    // Each list is fetched on its own so one failing still shows the other
    const fetchList = async <T,>(path: string, token: string | null): Promise<T[]> => {
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return [];
      }
    };

    const fetchData = async () => {
      try {
        const token = await getToken();
        const [movieData, showData] = await Promise.all([
          fetchList<Movie>("/api/movies", token),
          fetchList<TvShow>("/api/tvshows", token),
        ]);
        setMovies(movieData);
        setShows(showData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Save the scope and monthly spending range to localStorage
  useEffect(() => {
    localStorage.setItem("statsScope", scope);
  }, [scope]);

  useEffect(() => {
    localStorage.setItem("statsMonthlySpendStart", startMonth);
    localStorage.setItem("statsMonthlySpendEnd", endMonth);
  }, [startMonth, endMonth]);

  const items: StatItem[] = [
    ...(scope !== "tv" ? movies.map(movieItem) : []),
    ...(scope !== "movies" ? shows.map(tvItem) : []),
  ];
  const allSpend = [...movieSpend(movies), ...tvSpend(shows)];
  const spend = allSpend.filter(
    (e) =>
      scope === "all" ||
      (scope === "movies" && e.kind === "movie") ||
      (scope === "tv" && e.kind === "tv"),
  );

  const itemNoun =
    scope === "movies" ? "Movies" : scope === "tv" ? "TV Shows" : "Titles";

  const watched = items.filter((m) => m.hasWatched).length;
  const notWatched = items.length - watched;

  const watchedData = [
    { name: "Watched", value: watched },
    { name: "Not Watched", value: notWatched },
  ];

  const formatData = (() => {
    const counts: Record<string, number> = {};
    items.forEach((m) => {
      m.formats.forEach((fmt) => {
        counts[fmt] = (counts[fmt] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const genreDataFull = (() => {
    const counts: Record<string, number> = {};
    items.forEach((m) => {
      m.genres.forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  })();

  const genreData = genreDataFull.slice(0, 8);

  const conditionData = (() => {
    const counts: Record<string, number> = {};
    items.forEach((m) => {
      m.conditions.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const decadeData = (() => {
    const counts: Record<string, number> = {};
    items.forEach((m) => {
      if (!m.year) return;
      const decade = `${Math.floor(m.year / 10) * 10}s`;
      counts[decade] = (counts[decade] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  })();

  const WATCHED_COLORS = ["#6366f1", "#374151"];
  const FORMAT_COLORS = ["#06b6d4", "#8b5cf6", "#a855f7", "#ec4899"];
  const GENRE_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
  ];
  const CONDITION_COLORS = [
    "#22c55e",
    "#6366f1",
    "#eab308",
    "#f97316",
    "#ef4444",
  ];
  const DECADE_COLORS = [
    "#06b6d4",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
  ];

  const totalSpend = spend.reduce((sum, e) => sum + e.amount, 0);
  const ratedItems = items.filter((m) => m.rating > 0);
  const avgRating =
    ratedItems.length > 0
      ? ratedItems.reduce((sum, m) => sum + m.rating, 0) / ratedItems.length
      : 0;

  const ratingBuckets = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const ratingDistData = ratingBuckets.map((r) => ({
    label: r % 1 === 0 ? r.toFixed(0) : r.toFixed(1),
    count: items.filter((m) => m.rating === r).length,
  }));

  const onPlexCount = items.filter((m) => m.isOnPlex).length;

  const allMonthlyData = (() => {
    const counts: Record<string, number> = {};
    spend.forEach((e) => {
      counts[e.month] = (counts[e.month] || 0) + e.amount;
    });
    // The month range spans movies and TV together, so switching scope keeps the same
    // From/To options and a saved range; months with nothing in scope show as $0
    const keys = [...new Set(allSpend.map((e) => e.month))].sort();
    if (keys.length === 0) return [];

    // Include every month from the first to the last, so a month with no spending shows as $0
    const [firstYear, firstMonth] = keys[0].split("-").map(Number);
    const [lastYear, lastMonth] = keys[keys.length - 1].split("-").map(Number);
    const months = [];
    for (
      let date = new Date(firstYear, firstMonth - 1);
      date <= new Date(lastYear, lastMonth - 1);
      date.setMonth(date.getMonth() + 1)
    ) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      months.push({
        key,
        month: label,
        total: parseFloat((counts[key] || 0).toFixed(2)),
      });
    }
    return months;
  })();

  // Drop a saved month that now falls outside the first-to-last month range
  useEffect(() => {
    if (loading) return;
    const keys = new Set(allMonthlyData.map((d) => d.key));
    if (startMonth && !keys.has(startMonth)) setStartMonth("");
    if (endMonth && !keys.has(endMonth)) setEndMonth("");
  }, [loading, movies, shows]);

  const monthlySpendData = allMonthlyData.filter((d) => {
    if (startMonth && d.key < startMonth) return false;
    if (endMonth && d.key > endMonth) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] pt-2">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 md:px-20 py-8">

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Scope */}
            <div className="flex justify-center md:justify-start mb-4">
              <div className="inline-flex bg-gray-800 rounded-lg p-1">
                {SCOPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScope(s.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition cursor-pointer ${
                      scope === s.id
                        ? "bg-indigo-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 md:mb-10">
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">Total {itemNoun}</p>
                <p className="text-4xl font-bold text-white">{items.length}</p>
                {scope === "all" && (
                  <p className="text-gray-400 text-xs mt-1">
                    {movies.length} movie{movies.length !== 1 ? "s" : ""} ·{" "}
                    {shows.length} TV show{shows.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">On Jellyfin</p>
                <p className="text-4xl font-bold text-indigo-400">
                  {onPlexCount}
                </p>
              </div>
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 col-span-2 md:col-span-1">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-gray-400 text-sm">Ratings</p>
                  <p className="text-yellow-400 text-sm font-bold">
                    Avg {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={72}>
                  <BarChart
                    data={ratingDistData}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    barCategoryGap="8%"
                  >
                    <XAxis dataKey="label" hide />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number | undefined) => [value ?? 0, itemNoun]}
                      labelFormatter={(label) => `★ ${label}`}
                    />
                    <Bar
                      dataKey="count"
                      fill="#eab308"
                      radius={[2, 2, 0, 0]}
                      minPointSize={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 text-center  col-span-2 md:col-span-1">
                <p className="text-gray-400 text-sm mb-1">Total Spent</p>
                <p className="text-4xl font-bold text-green-400">
                  ${totalSpend.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Monthly Spend bar chart */}
            <div className="bg-gray-800 rounded-lg p-6 mb-4 md:mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold">Monthly Spending</h2>
                <div className="flex items-center gap-3 text-sm">
                  <label className="text-gray-400">From</label>
                  <select
                    value={startMonth}
                    onChange={(e) => {
                      setStartMonth(e.target.value);
                      if (endMonth && e.target.value > endMonth)
                        setEndMonth("");
                    }}
                    className="bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All</option>
                    {allMonthlyData.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.month}
                      </option>
                    ))}
                  </select>
                  <label className="text-gray-400">To</label>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All</option>
                    {allMonthlyData
                      .filter((d) => !startMonth || d.key >= startMonth)
                      .map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.month}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {monthlySpendData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={monthlySpendData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number | undefined) => [
                        `$${(value ?? 0).toFixed(2)}`,
                        "Spent",
                      ]}
                    />
                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <ChartCard
                title="Watched"
                data={watchedData}
                colors={WATCHED_COLORS}
              />
              <ChartCard
                title="Formats"
                data={formatData}
                colors={FORMAT_COLORS}
              />
              <ChartCard
                title="Top Genres"
                data={genreData}
                fullData={genreDataFull}
                colors={GENRE_COLORS}
              />
              <ChartCard
                title="Decades"
                data={decadeData}
                colors={DECADE_COLORS}
              />
              <ChartCard
                title="Condition"
                data={conditionData}
                colors={CONDITION_COLORS}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Stats;
