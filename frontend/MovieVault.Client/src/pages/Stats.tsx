import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Movie } from "../types";

function DataTable({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="overflow-y-auto max-h-75">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800">
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium text-right">Count</th>
            <th className="pb-2 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.name} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 pr-4 text-white">{row.name}</td>
              <td className="py-2 pr-4 text-gray-300 text-right">{row.value}</td>
              <td className="py-2 text-gray-300 text-right">
                {total > 0 ? ((row.value / total) * 100).toFixed(1) : "0"}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stats() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [tableView, setTableView] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";
  const API_URL = `${API_BASE}/api/movies`;

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(API_URL);
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
  const avgRating =
    movies.filter((m) => m.rating > 0).length > 0
      ? movies
          .filter((m) => m.rating > 0)
          .reduce((sum, m) => sum + m.rating, 0) /
        movies.filter((m) => m.rating > 0).length
      : 0;

  const onPlexCount = movies.filter((m) => m.isOnPlex).length;

  const allMonthlyData = (() => {
    const counts: Record<string, number> = {};
    movies.forEach((m) => {
      if (!m.createdAt) return;
      const date = new Date(m.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + (m.purchasePrice || 0);
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [year, month] = key.split('-');
        const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        return { key, month: label, total: parseFloat(total.toFixed(2)) };
      });
  })();

  const monthlySpendData = allMonthlyData.filter((d) => {
    if (startMonth && d.key < startMonth) return false;
    if (endMonth && d.key > endMonth) return false;
    return true;
  });

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelRenderProps) => {
    const cxN = cx as number;
    const cyN = cy as number;
    const midAngleN = midAngle as number;
    const innerR = innerRadius as number;
    const outerR = outerRadius as number;
    const pct = percent as number;
    if (pct < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerR + (outerR - innerR) * 0.5;
    const x = cxN + radius * Math.cos(-midAngleN * RADIAN);
    const y = cyN + radius * Math.sin(-midAngleN * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {`${(pct * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Collection Statistics</h1>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">Total Movies</p>
              <p className="text-4xl font-bold text-white">{movies.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">Total Spent</p>
              <p className="text-4xl font-bold text-green-400">
                ${totalSpend.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">Avg Rating</p>
              <p className="text-4xl font-bold text-yellow-400">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">On Plex</p>
              <p className="text-4xl font-bold text-indigo-400">
                {onPlexCount}
              </p>
            </div>
          </div>

          {/* Monthly Spend bar chart - full width */}
          <div className="bg-gray-800 rounded-lg p-6 mt-8 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">Monthly Spending</h2>
              <div className="flex items-center gap-3 text-sm">
                <label className="text-gray-400">From</label>
                <select
                  value={startMonth}
                  onChange={(e) => {
                    setStartMonth(e.target.value);
                    if (endMonth && e.target.value > endMonth) setEndMonth("");
                  }}
                  className="bg-gray-700 text-white rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All</option>
                  {allMonthlyData.map((d) => (
                    <option key={d.key} value={d.key}>{d.month}</option>
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
                      <option key={d.key} value={d.key}>{d.month}</option>
                    ))}
                </select>
              </div>
            </div>
            {monthlySpendData.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySpendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Spent']}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Watched / Not Watched donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Watched</h2>
                <button
                  onClick={() => setTableView((p) => ({ ...p, watched: !p.watched }))}
                  className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1 transition-colors"
                >
                  {tableView.watched ? "Donut" : "Table"}
                </button>
              </div>
              {movies.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : tableView.watched ? (
                <DataTable data={watchedData} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={watchedData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {watchedData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={WATCHED_COLORS[index % WATCHED_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number | undefined) => [
                        `${value ?? 0} movie${(value ?? 0) !== 1 ? "s" : ""}`,
                        "",
                      ]}
                    />
                    <Legend wrapperStyle={{ color: "#d1d5db" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Formats donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Formats</h2>
                <button
                  onClick={() => setTableView((p) => ({ ...p, formats: !p.formats }))}
                  className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1 transition-colors"
                >
                  {tableView.formats ? "Donut" : "Table"}
                </button>
              </div>
              {formatData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : tableView.formats ? (
                <DataTable data={formatData} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {formatData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={FORMAT_COLORS[index % FORMAT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number | undefined) => [
                        `${value ?? 0} movie${(value ?? 0) !== 1 ? "s" : ""}`,
                        "",
                      ]}
                    />
                    <Legend wrapperStyle={{ color: "#d1d5db" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Genres donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Top Genres</h2>
                <button
                  onClick={() => setTableView((p) => ({ ...p, genres: !p.genres }))}
                  className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1 transition-colors"
                >
                  {tableView.genres ? "Donut" : "Table"}
                </button>
              </div>
              {genreDataFull.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : tableView.genres ? (
                <DataTable data={genreDataFull} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {genreData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={GENRE_COLORS[index % GENRE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        color: "#000",
                      }}
                      formatter={(value: number | undefined) => [
                        `${value ?? 0} movie${(value ?? 0) !== 1 ? "s" : ""}`,
                        "",
                      ]}
                    />
                    <Legend wrapperStyle={{ color: "#d1d5db" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Decades donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Decades</h2>
                <button
                  onClick={() => setTableView((p) => ({ ...p, decades: !p.decades }))}
                  className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1 transition-colors"
                >
                  {tableView.decades ? "Donut" : "Table"}
                </button>
              </div>
              {decadeData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : tableView.decades ? (
                <DataTable data={decadeData} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={decadeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {decadeData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={DECADE_COLORS[index % DECADE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number | undefined) => [
                        `${value ?? 0} movie${(value ?? 0) !== 1 ? "s" : ""}`,
                        "",
                      ]}
                    />
                    <Legend wrapperStyle={{ color: "#d1d5db" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Condition donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Condition</h2>
                <button
                  onClick={() => setTableView((p) => ({ ...p, condition: !p.condition }))}
                  className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded px-2 py-1 transition-colors"
                >
                  {tableView.condition ? "Donut" : "Table"}
                </button>
              </div>
              {conditionData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : tableView.condition ? (
                <DataTable data={conditionData} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={conditionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {conditionData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            CONDITION_COLORS[index % CONDITION_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "none",
                        borderRadius: "8px",
                        color: "#000",
                      }}
                      formatter={(value: number | undefined) => [
                        `${value ?? 0} movie${(value ?? 0) !== 1 ? "s" : ""}`,
                        "",
                      ]}
                    />
                    <Legend wrapperStyle={{ color: "#d1d5db" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Stats;
