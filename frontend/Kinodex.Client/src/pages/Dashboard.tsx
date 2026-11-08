import { useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
import PageShell from "../components/PageShell";
import {
  monthKey,
  movieSpend,
  tvSpend,
  type SpendEntry,
} from "../utils/spending";
import { ChartPie, ChevronLeft, ChevronRight, Download, Film, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddItemModal } from "../components/lazyComponents";
import AccountMenuButton from "../components/AccountMenuButton";

interface Stats {
  thisMonth: MonthSpend;
  lastMonth: MonthSpend;
}

interface MonthSpend {
  label: string;
  spend: number;
  count: number;
}

// A movie or TV show in a Recently Added row
interface RecentItem {
  key: string;
  title: string;
  posterPath: string;
  createdAt?: string;
  to: string;
}

// On mobile each card is 26% of the row, so three fit with part of the fourth peeking in
// to show the row scrolls; from tablet up the cards share the row
const quickActionClass =
  "shrink-0 w-[26%] cursor-pointer rounded-xl border border-border bg-card p-3 text-center shadow-xs outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-auto md:flex-1 md:p-6";
const quickActionIconClass = "mb-2 flex h-6 items-center justify-center text-muted-foreground md:mb-3 md:h-8 [&_svg]:size-5 md:[&_svg]:size-7";
const quickActionLabelClass = "text-sm leading-tight font-medium md:text-base";

// Total spent in the given calendar month, across movies and TV purchases
function getMonthSpend(entries: SpendEntry[], monthStart: Date): MonthSpend {
  const key = monthKey(monthStart);
  const inMonth = entries.filter((e) => e.month === key);
  return {
    label: monthStart.toLocaleString("default", { month: "long" }),
    spend: inMonth.reduce((sum, e) => sum + e.amount, 0),
    count: inMonth.length,
  };
}

// The 20 most recently added, newest first
const newestFirst = (items: RecentItem[]) =>
  [...items]
    .sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 20);

// A titled row of posters that scrolls sideways (swipe, trackpad, or the arrows from tablet up)
function RecentCarousel({ title, items }: { title: string; items: RecentItem[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: "smooth" });
  };

  if (items.length === 0) return null;
  return (
    // Below desktop the row shares the height left on screen and the posters size to fit it, so
    // the page needs no scrolling; on desktop the posters have a fixed width
    <section className="flex-1 min-h-32 flex flex-col lg:flex-none lg:min-h-0">
      <div className="shrink-0 flex items-center justify-between mb-2 md:mb-3">
        <h2 className="text-base font-semibold tracking-tight md:text-lg">{title}</h2>
        <div className="hidden md:flex gap-2">
          {([-1, 1] as const).map((direction) => (
            <Button
              key={direction}
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => scroll(direction)}
              aria-label={direction < 0 ? "Scroll back" : "Scroll forward"}
            >
              {direction < 0 ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          ))}
        </div>
      </div>
      <div
        ref={rowRef}
        className="flex-1 min-h-0 lg:flex-none flex gap-3 md:gap-4 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar"
      >
        {items.map((item) => (
          <div key={item.key} className="shrink-0 h-full aspect-2/3 lg:h-auto lg:w-28">
            {/* Poster only; the title shows on hover (tooltip) and in the drawer it opens */}
            <Link
              to={item.to}
              title={item.title}
              data-slot="recent-poster"
              className="block h-full w-full overflow-hidden rounded-[4px] border border-border bg-muted shadow-md outline-none transition-colors duration-200 hover:border-primary focus-visible:border-ring md:rounded-lg"
            >
              {item.posterPath ? (
                <img
                  src={item.posterPath}
                  alt={`${item.title} poster`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="px-2 text-center text-xs text-muted-foreground">{item.title}</span>
                </div>
              )}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Dashboard() {
  const { user } = useUser();
  // Separate queries, so one failing still shows the other
  const { data: movies = [], isLoading: moviesLoading } = useMovies();
  const { data: shows = [], isLoading: showsLoading } = useTvShows();
  const loading = moviesLoading || showsLoading;
  const [showAddModal, setShowAddModal] = useState(false);

  // Spending this month and last, across movies and TV purchases
  const now = new Date();
  const spend = [...movieSpend(movies), ...tvSpend(shows)];
  const stats: Stats = {
    thisMonth: getMonthSpend(spend, new Date(now.getFullYear(), now.getMonth())),
    lastMonth: getMonthSpend(spend, new Date(now.getFullYear(), now.getMonth() - 1)),
  };

  // The 20 most recently added movies, and the same for TV shows, newest first
  const recentMovies = newestFirst(
    movies.map((m) => ({
      key: `movie-${m.id}`,
      title: m.title,
      posterPath: m.posterPath,
      createdAt: m.createdAt,
      to: `/library?movie=${m.id}`, // The movie list, with this movie open in its drawer
    })),
  );
  const recentShows = newestFirst(
    shows.map((s) => ({
      key: `tv-${s.id}`,
      title: s.title,
      posterPath: s.posterPath,
      createdAt: s.createdAt,
      to: `/tv-shows?show=${s.id}`, // The TV list, with this show open in its drawer
    })),
  );

  return (
    // Sized to the screen so the columns scroll instead of running off it
    <PageShell className="flex-row pt-2">
      {/* Same content width as the Stats page */}
      <div className="flex-1 flex flex-col min-h-0 w-full px-4 md:px-20">
        {loading ? (
          <LoadingSpinner />
        ) : (
          // Mobile: one column; Recently Added under the quick actions. Its page padding is moved onto
          // this box (-mx-4 px-4) so the carousels can reach the screen edges without being clipped.
          // Desktop: two columns; collection data on the left, the Recently Added rows on the right.
          <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6 overflow-y-auto overflow-x-hidden -mx-4 px-4 md:mx-0 md:px-0 lg:overflow-hidden lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-8 mt-4 md:mt-6">
            {/* Left column */}
            {/* lg:px-2/-mx-2 makes room for the quick actions' -m-2 hover margin, so the column never scrolls sideways */}
            <div className="shrink-0 flex flex-col gap-3 md:gap-6 lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:px-2 lg:-mx-2 lg:pb-8">
              {/* Who's signed in: account badge (opens the Clerk account menu) and name, Settings on the right.
                  mb-2 on phones adds to the column's 12px gap so the row has room to breathe */}
              <div className="flex items-center justify-between gap-4 mb-2 md:mb-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile and tablet: Clerk's own button, at double its default 28px. A style object
                      rather than Tailwind classes: Tailwind v4's layered utilities lose to Clerk's
                      own unlayered styles. */}
                  <div className="lg:hidden flex">
                    <UserButton
                      appearance={{ elements: { avatarBox: { width: "3.5rem", height: "3.5rem" } } }}
                    />
                  </div>
                  {/* Desktop: same size, but its account menu opens to the right */}
                  <div className="hidden lg:flex">
                    <AccountMenuButton size={56} />
                  </div>
                  <p className="truncate text-lg font-semibold tracking-tight">
                    {user?.username || user?.firstName || "Welcome"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/settings">
                    <Settings />
                    Settings
                  </Link>
                </Button>
              </div>

              {/* Spending This Month and Last Month */}
              <div className="rounded-xl border border-border bg-card p-3 md:p-6">
                <div className="grid grid-cols-2 divide-x divide-border">
                  {[
                    { title: "This month", month: stats.thisMonth },
                    { title: "Last month", month: stats.lastMonth },
                  ].map(({ title, month }, idx) => (
                    <div key={idx} className={idx === 0 ? "pr-3 md:pr-6" : "pl-3 md:pl-6"}>
                      <p className="text-sm font-medium md:text-base">{title}</p>
                      <p className="text-xs text-muted-foreground md:text-sm">{month.label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums md:mt-2 md:text-4xl">
                        ${month.spend.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>


              {/* Quick Actions */}
              {/* Mobile: three cards fit across and the rest scroll. Tablet: four in a row. Desktop: a 2x2 grid in the left column. Padding leaves room for the hover lift and focus ring; on mobile the row runs to the screen edges, like the carousels. */}
              <div className="flex lg:grid lg:grid-cols-2 gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible no-scrollbar -my-2 py-2 -mx-4 px-4 md:-m-2 md:p-2">
                <Link to="/library" data-slot="quick-action" className={quickActionClass}>
                  <div className={quickActionIconClass}>
                    <Film />
                  </div>
                  <h3 className={quickActionLabelClass}>Library</h3>
                </Link>

                <button
                  type="button"
                  data-slot="quick-action"
                  onClick={() => setShowAddModal(true)}
                  className={quickActionClass}
                >
                  <div className={quickActionIconClass}>
                    <Plus />
                  </div>
                  <h3 className={quickActionLabelClass}>Add</h3>
                </button>

                <Link to="/stats" data-slot="quick-action" className={quickActionClass}>
                  <div className={quickActionIconClass}>
                    <ChartPie />
                  </div>
                  <h3 className={quickActionLabelClass}>Stats</h3>
                </Link>
                <Link to="/export" data-slot="quick-action" className={quickActionClass}>
                  <div className={quickActionIconClass}>
                    <Download />
                  </div>
                  <h3 className={quickActionLabelClass}>CSV</h3>
                </Link>
              </div>
            </div>

            {/* Right column: Recently Added movies, then TV shows */}
            {(recentMovies.length > 0 || recentShows.length > 0) && (
              <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6 lg:flex-none lg:overflow-y-auto lg:overflow-x-hidden pb-4 md:pb-8">
                <RecentCarousel title="Recently Added Movies" items={recentMovies} />
                <RecentCarousel title="Recently Added TV Shows" items={recentShows} />
              </div>
            )}
          </div>
        )}
      </div>
      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} />
      )}
    </PageShell>
  );
}

export default Dashboard;
