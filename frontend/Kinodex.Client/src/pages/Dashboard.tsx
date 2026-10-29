import { useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useMovies } from "../features/movies/api";
import { useTvShows } from "../features/tvShows/api";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import {
  monthKey,
  movieSpend,
  tvSpend,
  type SpendEntry,
} from "../utils/spending";
import {
  FaFilm,
  FaDownload,
  FaChartPie,
  FaPlus,
  FaCog,
} from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { AddItemModal } from "../components/AddItemModal";
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
  "shrink-0 w-[26%] md:w-auto md:flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg p-3 md:p-8 transition-all duration-200 transform hover:scale-105 text-center";

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
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        <div className="hidden md:flex gap-2">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => scroll(direction)}
              className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md text-gray-300 hover:text-white transition-colors cursor-pointer"
              aria-label={direction < 0 ? "Scroll back" : "Scroll forward"}
            >
              {direction < 0 ? (
                <FaChevronLeft className="w-3 h-3" />
              ) : (
                <FaChevronRight className="w-3 h-3" />
              )}
            </button>
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
              className="block w-full h-full rounded border border-white/20 overflow-hidden shadow-lg transition-colors duration-200 hover:border-indigo-500"
            >
              {item.posterPath ? (
                <img
                  src={item.posterPath}
                  alt={`${item.title} poster`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-xs text-center px-2">{item.title}</span>
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
  // Size the page to the viewport so the columns scroll instead of running off screen
  const { ref: containerRef, style: containerStyle } = useFillViewportHeight<HTMLDivElement>();

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
    <div
      ref={containerRef}
      className="flex h-[calc(100dvh-5rem)] pt-2"
      style={containerStyle}
    >
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
                  <p className="text-lg font-semibold text-white truncate">
                    {user?.username || user?.firstName || "Welcome"}
                  </p>
                </div>
                <Link
                  to="/settings"
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                >
                  <FaCog className="w-4 h-4" />
                  Settings
                </Link>
              </div>

              {/* Spending This Month and Last Month */}
              <div className="bg-linear-to-br from-green-600 to-green-700 rounded-lg shadow-lg p-3 md:p-6">
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
                    </div>
                  ))}
                </div>
              </div>


              {/* Quick Actions */}
              {/* Mobile: three cards fit across and the rest scroll. Tablet: four in a row. Desktop: a 2x2 grid in the left column. Padding leaves room for the hover scale; on mobile the row runs to the screen edges, like the carousels. */}
              <div className="flex lg:grid lg:grid-cols-2 gap-3 md:gap-6 overflow-x-auto md:overflow-x-visible no-scrollbar -my-2 py-2 -mx-4 px-4 md:-m-2 md:p-2">
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
    </div>
  );
}

export default Dashboard;
