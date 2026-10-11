import { useState, useEffect } from "react";
import { useAuth, useUser, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import type { Movie, TvShow } from "../types";
import { useFillViewportHeight } from "../utils/useFillViewportHeight";
import {
  monthKey,
  movieSpend,
  tvSpend,
  type SpendEntry,
} from "../utils/spending";
import {
  FaFilm,
  FaTv,
  FaDownload,
  FaChartPie,
  FaPlus,
  FaCog,
} from "react-icons/fa";
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

// A movie or TV show in the Recently Added list
interface RecentItem {
  key: string;
  title: string;
  createdAt?: string;
  to: string;
  isTv: boolean; // Picks the sidebar's Movies or TV Shows icon
}

// On mobile each card is 26% of the row, so three fit with part of the fourth peeking in
// to show the row scrolls; from tablet up the cards share the row
const quickActionClass =
  "shrink-0 snap-start w-[26%] md:w-auto md:flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg shadow-lg p-3 md:p-8 transition-all duration-200 transform hover:scale-105 text-center";

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

function Dashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({
    thisMonth: { label: "", spend: 0, count: 0 },
    lastMonth: { label: "", spend: 0, count: 0 },
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  // Size the page to the viewport so Recently Added scrolls instead of running off screen
  const container = useFillViewportHeight<HTMLDivElement>();

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

  useEffect(() => {
    fetchData();
  }, []);

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
      const [movies, shows] = await Promise.all([
        fetchList<Movie>("/api/movies", token),
        fetchList<TvShow>("/api/tvshows", token),
      ]);

      const now = new Date();
      const spend = [...movieSpend(movies), ...tvSpend(shows)];

      setStats({
        thisMonth: getMonthSpend(
          spend,
          new Date(now.getFullYear(), now.getMonth()),
        ),
        lastMonth: getMonthSpend(
          spend,
          new Date(now.getFullYear(), now.getMonth() - 1),
        ),
      });

      // 20 most recently added movies and shows; enough to fill the list, which scrolls if longer
      const recent: RecentItem[] = [
        ...movies.map((m) => ({
          key: `movie-${m.id}`,
          title: m.title,
          createdAt: m.createdAt,
          to: `/movie/${m.id}`,
          isTv: false,
        })),
        ...shows.map((s) => ({
          key: `tv-${s.id}`,
          title: s.title,
          createdAt: s.createdAt,
          to: `/tv-shows/${s.id}`,
          isTv: true,
        })),
      ]
        .sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        })
        .slice(0, 20);
      setRecentItems(recent);
    } catch (error) {
      console.error("Error loading dashboard:", error);
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
      {/* Same content width as the Stats page */}
      <div className="flex-1 flex flex-col min-h-0 w-full px-4 md:px-20">
        {loading ? (
          <LoadingSpinner />
        ) : (
          // Mobile: one column; the page fits the screen and Recently Added scrolls in what's left.
          // Desktop: two columns; collection data on the left, Recently Added filling the right.
          <div className="flex-1 min-h-0 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-8 mt-4 md:mt-6">
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
                      {/* <p className="text-green-200 text-xs md:text-sm mt-1">
                        {month.count} movie{month.count !== 1 ? "s" : ""} added
                      </p> */}
                    </div>
                  ))}
                </div>
              </div>


              {/* Quick Actions */}
              {/* Mobile: three cards fit across and the rest scroll. Tablet: four in a row. Desktop: a 2x2 grid in the left column. Padding leaves room for the hover scale. */}
              <div className="flex lg:grid lg:grid-cols-2 gap-3 md:gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none scroll-px-2 -m-2 p-2">
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

            {/* Right column: Recently Added */}
            {recentItems.length > 0 && (
              <div className="flex-1 min-h-48 lg:min-h-0 flex flex-col pb-6 md:pb-8">
                {/* pb-6 on mobile matches the 24px above the content (pt-2 + mt-4) */}
                <h2 className="shrink-0 text-2xl font-bold mb-3 md:mb-4">Recently Added</h2>
                {/* flex-1 fills the space down to the bottom of the screen; the rows scroll inside it */}
                <div className="flex-1 min-h-0 bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
                  <div className="divide-y divide-gray-700">
                    {recentItems.map((item) => (
                      <Link
                        key={item.key}
                        to={item.to}
                        className="flex items-center gap-3 p-4 hover:bg-gray-700 transition-colors"
                      >
                        {/* Same icons as the sidebar's Movies and TV Shows items */}
                        {item.isTv ? (
                          <FaTv
                            className="w-5 h-5 shrink-0 text-gray-400"
                            title="TV show"
                          />
                        ) : (
                          <FaFilm
                            className="w-5 h-5 shrink-0 text-gray-400"
                            title="Movie"
                          />
                        )}
                        <h3
                          className="min-w-0 text-lg font-semibold text-white truncate"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                      </Link>
                    ))}
                  </div>
                </div>
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
