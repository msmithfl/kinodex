import { useState, useEffect } from "react";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
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
import ChartBreakdown from "../components/ChartBreakdown";
import { allFormats } from "../utils/tvShowPurchases";
import { movieSpend, tvSpend } from "../utils/spending";

// The fields the charts read, shared by movies and TV shows
interface StatItem {
  kind: "movie" | "tv";
  rating: number;
  hasWatched: boolean;
  isStreaming: boolean;
  year: number;
  genres: string[];
  formats: string[];
  conditions: string[]; // A movie has one; a TV show has one per purchase
}

const movieItem = (m: Movie): StatItem => ({
  kind: "movie",
  rating: m.rating,
  hasWatched: m.hasWatched,
  isStreaming: m.isStreaming,
  year: m.year,
  genres: m.genres,
  formats: m.formats,
  conditions: m.condition ? [m.condition] : [],
});

const tvItem = (s: TvShow): StatItem => ({
  kind: "tv",
  rating: s.rating,
  hasWatched: s.hasWatched,
  isStreaming: s.isStreaming,
  year: s.year,
  genres: s.genres,
  formats: allFormats(s.purchases),
  conditions: s.purchases.map((p) => p.condition).filter(Boolean),
});

// Stable empty lists while loading, so effects that watch the lists don't re-run every render
const NO_MOVIES: Movie[] = [];
const NO_SHOWS: TvShow[] = [];

function Stats() {
  // Separate queries, so one failing still shows the other
  const { data: movieData, isLoading: moviesLoading } = useMovies();
  const { data: showData, isLoading: showsLoading } = useTvShows();
  const movies = movieData ?? NO_MOVIES;
  const shows = showData ?? NO_SHOWS;
  const loading = moviesLoading || showsLoading;
  const [startMonth, setStartMonth] = useState(
    () => localStorage.getItem("statsMonthlySpendStart") || "",
  );
  const [endMonth, setEndMonth] = useState(
    () => localStorage.getItem("statsMonthlySpendEnd") || "",
  );
  // Fills the screen below the header and above the mobile bottom bar
  const { ref: viewportRef, style: viewportStyle } = useFillViewportHeight<HTMLDivElement>([loading]);

  // Save the monthly spending range to localStorage
  useEffect(() => {
    localStorage.setItem("statsMonthlySpendStart", startMonth);
    localStorage.setItem("statsMonthlySpendEnd", endMonth);
  }, [startMonth, endMonth]);

  // Every stat covers movies and TV shows together
  const items: StatItem[] = [...movies.map(movieItem), ...shows.map(tvItem)];
  const spend = [...movieSpend(movies), ...tvSpend(shows)];

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
  const sumSpend = (kind: "movie" | "tv") =>
    spend.filter((e) => e.kind === kind).reduce((sum, e) => sum + e.amount, 0);
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

  const streamingCount = items.filter((m) => m.isStreaming).length;

  // A small labelled figure in the lower half of a summary card
  const summaryStat = (
    label: string,
    value: string | number,
    valueClass = "text-white",
  ) => (
    <div className="px-2 min-w-0">
      <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
      <p className="text-gray-400 text-xs truncate">{label}</p>
    </div>
  );

  const allMonthlyData = (() => {
    const counts: Record<string, number> = {};
    spend.forEach((e) => {
      counts[e.month] = (counts[e.month] || 0) + e.amount;
    });
    const keys = [...new Set(spend.map((e) => e.month))].sort();
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

  // Drop a saved month that now falls outside the first-to-last month range (adjusted while
  // rendering; once cleared, the checks no longer match, so it settles in one pass)
  if (!loading) {
    const keys = new Set(allMonthlyData.map((d) => d.key));
    if (startMonth && !keys.has(startMonth)) setStartMonth("");
    if (endMonth && !keys.has(endMonth)) setEndMonth("");
  }

  const monthlySpendData = allMonthlyData.filter((d) => {
    if (startMonth && d.key < startMonth) return false;
    if (endMonth && d.key > endMonth) return false;
    return true;
  });

  return (
    <div ref={viewportRef} className="flex flex-col h-[calc(100dvh-5rem)] pt-2" style={viewportStyle}>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 md:px-20 pt-2 md:pt-4 pb-8">
        <h1 className="text-2xl font-bold mb-4">Collection Statistics</h1>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Summary cards: spending, collection, ratings. Stacked until desktop, where they share a row at equal height */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 md:mb-10">
              {/* Total Spent, with the Movies / TV split */}
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Total Spent</p>
                  <p className="text-4xl font-bold text-green-400">
                    ${totalSpend.toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-700 border-t border-gray-700 mt-3 pt-3 text-center">
                  {summaryStat("Movies", `$${sumSpend("movie").toFixed(2)}`)}
                  {summaryStat("TV Shows", `$${sumSpend("tv").toFixed(2)}`)}
                </div>
              </div>

              {/* Collection: the title count, the Movies / TV split, and how many are streaming */}
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Total Titles</p>
                  <p className="text-4xl font-bold text-white">{items.length}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-700 border-t border-gray-700 mt-3 pt-3 text-center">
                  {summaryStat("Movies", movies.length)}
                  {summaryStat("TV Shows", shows.length)}
                  {summaryStat("Streaming", streamingCount, "text-indigo-400")}
                </div>
              </div>
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5">
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
                      formatter={(value: number | undefined) => [value ?? 0, "Titles"]}
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
            </div>

            {/* Spending and the breakdown donut: stacked on mobile, side by side on desktop,
                where the grid stretches both cards to the same height */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
              {/* Monthly Spend bar chart */}
              <div className="bg-gray-800 rounded-lg p-6 min-w-0">
                {/* min-h-9 and the divider match the Breakdown header so both charts start at the same line */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 min-h-9 pb-3 border-b border-gray-700">
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

              {/* Breakdown donut, one dataset at a time */}
              <ChartBreakdown
                title="Collection Breakdown"
                storageKey="statsBreakdown"
                countLabel={(n) => `${n} title${n !== 1 ? "s" : ""}`}
                options={[
                  { id: "watched", label: "Watched", data: watchedData, colors: WATCHED_COLORS },
                  { id: "formats", label: "Formats", data: formatData, colors: FORMAT_COLORS },
                  {
                    id: "genres",
                    label: "Top Genres",
                    data: genreData,
                    fullData: genreDataFull,
                    colors: GENRE_COLORS,
                  },
                  { id: "decades", label: "Decades", data: decadeData, colors: DECADE_COLORS },
                  { id: "condition", label: "Condition", data: conditionData, colors: CONDITION_COLORS },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Stats;
