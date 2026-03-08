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
import type { Movie } from "../types";
import ChartCard from "../components/ChartCard";

function Stats() {
  const { getToken } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const token = await getToken();
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data: Movie[] = await response.json();
          setMovies(data);
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const watched = movies.filter((m) => m.hasWatched).length;
  const notWatched = movies.length - watched;

  const watchedData = [
    { name: "Watched", value: watched },
    { name: "Not Watched", value: notWatched },
  ];

  const formatData = (() => {
    const counts: Record<string, number> = {};
    movies.forEach((m) => {
      m.formats.forEach((fmt) => {
        counts[fmt] = (counts[fmt] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const genreDataFull = (() => {
    const counts: Record<string, number> = {};
    movies.forEach((m) => {
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
    movies.forEach((m) => {
      counts[m.condition] = (counts[m.condition] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const decadeData = (() => {
    const counts: Record<string, number> = {};
    movies.forEach((m) => {
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

  const totalSpend = movies.reduce((sum, m) => sum + (m.purchasePrice || 0), 0);
  const ratedMovies = movies.filter((m) => m.rating > 0);
  const avgRating =
    ratedMovies.length > 0
      ? ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length
      : 0;

  const ratingBuckets = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const ratingDistData = ratingBuckets.map((r) => ({
    label: r % 1 === 0 ? r.toFixed(0) : r.toFixed(1),
    count: movies.filter((m) => m.rating === r).length,
  }));

  const onPlexCount = movies.filter((m) => m.isOnPlex).length;

  const allMonthlyData = (() => {
    const counts: Record<string, number> = {};
    movies.forEach((m) => {
      if (!m.createdAt) return;
      const date = new Date(m.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = (counts[key] || 0) + (m.purchasePrice || 0);
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [year, month] = key.split("-");
        const label = new Date(
          parseInt(year),
          parseInt(month) - 1,
        ).toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
        return { key, month: label, total: parseFloat(total.toFixed(2)) };
      });
  })();

  const monthlySpendData = allMonthlyData.filter((d) => {
    if (startMonth && d.key < startMonth) return false;
    if (endMonth && d.key > endMonth) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] pt-2">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 md:px-20 pb-8">
        <h1 className="text-3xl font-bold my-8">Collection Statistics</h1>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">Total Movies</p>
                <p className="text-4xl font-bold text-white">{movies.length}</p>
              </div>
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">Total Spent</p>
                <p className="text-4xl font-bold text-green-400">
                  ${totalSpend.toFixed(2)}
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
                      formatter={(value: number | undefined) => [value ?? 0, "Movies"]}
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
              <div className="flex flex-col justify-center bg-gray-800 rounded-lg p-5 text-center">
                <p className="text-gray-400 text-sm mb-1">On Plex</p>
                <p className="text-4xl font-bold text-indigo-400">
                  {onPlexCount}
                </p>
              </div>
            </div>

            {/* Monthly Spend bar chart */}
            <div className="bg-gray-800 rounded-lg p-6 mt-8 mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
