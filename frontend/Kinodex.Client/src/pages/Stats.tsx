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
import { Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Movie, TvShow } from "../types";
import ChartBreakdown from "../components/ChartBreakdown";
import { allFormats } from "../utils/tvShowPurchases";
import { movieSpend, tvSpend } from "../utils/spending";
import {
  CATEGORICAL,
  CHART_ACCENT,
  CHART_NEUTRAL,
  CHART_STAR,
  CHART_TICK,
  CHART_TOOLTIP,
  ordinalRamp,
} from "../utils/chartColors";

// Fixed orders, so a format or condition keeps its colour whatever else the collection holds
const FORMAT_ORDER = ["4K", "Blu-ray", "DVD", "VHS", "Digital"];
const CONDITION_ORDER = ["Sealed", "Like New", "Good", "Poor", "Damaged"];
const CONDITION_COLORS = ordinalRamp(CONDITION_ORDER.length);

// Counted rows in a fixed order, with anything not in that order after them
const inOrder = (rows: { name: string; value: number }[], order: string[]) => {
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
  return [...rows].sort((a, b) => rank(a.name) - rank(b.name));
};

// A row's colour from its place in the fixed order; anything unexpected is neutral
const colorsInOrder = (rows: { name: string }[], order: string[], palette: string[]) =>
  rows.map(({ name }) => (order.includes(name) ? palette[order.indexOf(name)] : CHART_NEUTRAL));

// The select can't use an empty value, so "All" has its own; the range still stores ""
const ALL_MONTHS = "__all__";

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
    { name: "Not watched", value: notWatched },
  ];

  const formatData = (() => {
    const counts: Record<string, number> = {};
    items.forEach((m) => {
      m.formats.forEach((fmt) => {
        counts[fmt] = (counts[fmt] || 0) + 1;
      });
    });
    return inOrder(Object.entries(counts).map(([name, value]) => ({ name, value })), FORMAT_ORDER);
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
    return inOrder(Object.entries(counts).map(([name, value]) => ({ name, value })), CONDITION_ORDER);
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
  const summaryStat = (label: string, value: string | number) => (
    <div className="min-w-0 px-3 first:pl-0">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
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
    <div ref={viewportRef} className="flex h-[calc(100dvh-5rem)] flex-col bg-background" style={viewportStyle}>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-4 pt-4 pb-8 md:px-20 md:pt-7">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight md:mb-6 md:text-[28px]">Collection statistics</h1>

        {loading ? (
          <div className="flex flex-col gap-4 md:gap-6" aria-busy="true" aria-label="Loading statistics">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards: spending, collection, ratings. Stacked until desktop, where they share a row at equal height */}
            <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 lg:grid-cols-3">
              {/* Total Spent, with the Movies / TV split */}
              <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-5">
                <p className="mb-1 text-sm text-muted-foreground">Total spent</p>
                <p className="text-4xl font-semibold tracking-tight">${totalSpend.toFixed(2)}</p>
                <div className="mt-3 grid grid-cols-2 divide-x divide-border border-t border-border pt-3">
                  {summaryStat("Movies", `$${sumSpend("movie").toFixed(2)}`)}
                  {summaryStat("TV shows", `$${sumSpend("tv").toFixed(2)}`)}
                </div>
              </div>

              {/* Collection: the title count, the Movies / TV split, and how many are streaming */}
              <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-5">
                <p className="mb-1 text-sm text-muted-foreground">Total titles</p>
                <p className="text-4xl font-semibold tracking-tight">{items.length}</p>
                <div className="mt-3 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
                  {summaryStat("Movies", movies.length)}
                  {summaryStat("TV shows", shows.length)}
                  {summaryStat("Streaming", streamingCount)}
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm text-muted-foreground">Ratings</p>
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="size-3.5 self-center fill-yellow-500 text-yellow-500" aria-hidden="true" />
                    Avg {avgRating > 0 ? avgRating.toFixed(1) : "–"}
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
                      {...CHART_TOOLTIP}
                      formatter={(value: number | undefined) => [value ?? 0, "Titles"]}
                      labelFormatter={(label) => `★ ${label}`}
                    />
                    <Bar dataKey="count" fill={CHART_STAR} radius={[2, 2, 0, 0]} minPointSize={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spending and the breakdown donut: stacked on mobile, side by side on desktop,
                where the grid stretches both cards to the same height */}
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
              {/* Monthly Spend bar chart */}
              <div className="min-w-0 rounded-xl border border-border bg-card p-5">
                {/* min-h-9 and the divider match the Breakdown header so both charts start at the same line */}
                <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
                  <h2 className="text-base font-semibold">Monthly spending</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>From</span>
                    <Select
                      value={startMonth || ALL_MONTHS}
                      onValueChange={(value) => {
                        const next = value === ALL_MONTHS ? "" : value;
                        setStartMonth(next);
                        if (endMonth && next > endMonth) setEndMonth("");
                      }}
                    >
                      <SelectTrigger size="sm" aria-label="From month" className="text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_MONTHS}>All</SelectItem>
                        {allMonthlyData.map((d) => (
                          <SelectItem key={d.key} value={d.key}>
                            {d.month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>To</span>
                    <Select
                      value={endMonth || ALL_MONTHS}
                      onValueChange={(value) => setEndMonth(value === ALL_MONTHS ? "" : value)}
                    >
                      <SelectTrigger size="sm" aria-label="To month" className="text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_MONTHS}>All</SelectItem>
                        {allMonthlyData
                          .filter((d) => !startMonth || d.key >= startMonth)
                          .map((d) => (
                            <SelectItem key={d.key} value={d.key}>
                              {d.month}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {monthlySpendData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlySpendData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                      <YAxis
                        tick={CHART_TICK}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        {...CHART_TOOLTIP}
                        formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, "Spent"]}
                      />
                      <Bar dataKey="total" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Breakdown donut, one dataset at a time */}
              <ChartBreakdown
                title="Collection breakdown"
                storageKey="statsBreakdown"
                countLabel={(n) => `${n} title${n !== 1 ? "s" : ""}`}
                options={[
                  { id: "watched", label: "Watched", data: watchedData, colors: [CHART_ACCENT, CHART_NEUTRAL] },
                  {
                    id: "formats",
                    label: "Formats",
                    data: formatData,
                    colors: colorsInOrder(formatData, FORMAT_ORDER, CATEGORICAL),
                  },
                  {
                    id: "genres",
                    label: "Top genres",
                    data: genreData,
                    fullData: genreDataFull,
                    colors: CATEGORICAL,
                  },
                  { id: "decades", label: "Decades", data: decadeData, colors: ordinalRamp(decadeData.length) },
                  {
                    id: "condition",
                    label: "Condition",
                    data: conditionData,
                    colors: colorsInOrder(conditionData, CONDITION_ORDER, CONDITION_COLORS),
                  },
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
