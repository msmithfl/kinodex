import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

// Each page is its own download, fetched the first time it's opened, so the first load only
// carries the page being opened (Stats' charts, for one, are only downloaded on Stats)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MovieList = lazy(() => import("./pages/MovieList"));
const TvShowList = lazy(() => import("./pages/TvShowList"));
const CollectionsView = lazy(() => import("./pages/CollectionsView"));
const GenresView = lazy(() => import("./pages/GenresView"));
const GenreDetail = lazy(() => import("./pages/GenreDetail"));
const Stats = lazy(() => import("./pages/Stats"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Settings = lazy(() => import("./pages/Settings"));
const CsvExport = lazy(() => import("./pages/CsvExport"));
const JellyfinPage = lazy(() => import("./pages/JellyfinPage"));

// Collections open in a drawer on the Collections page now; old /collections/:name links land there
function CollectionRedirect() {
  const { collectionName = "" } = useParams<{ collectionName: string }>();
  return <Navigate replace to={`/collections?collection=${encodeURIComponent(collectionName)}`} />;
}

// Movies and TV shows open in a drawer on their lists; the old full pages are retired, so old
// /movie/:id and /tv-shows/:id links land on the list with the drawer open
function MovieRedirect() {
  const { id = "" } = useParams<{ id: string }>();
  return <Navigate replace to={`/library?movie=${encodeURIComponent(id)}`} />;
}

function TvShowRedirect() {
  const { id = "" } = useParams<{ id: string }>();
  return <Navigate replace to={`/tv-shows?show=${encodeURIComponent(id)}`} />;
}

function App() {
  return (
    <Routes>
      {/* Auth pages — no header/sidebar */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* App layout — all protected */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            {/* The sides keep clear of a notch in landscape (the app is drawn edge to edge, index.html) */}
            <div className="min-h-screen bg-background text-foreground flex flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
              <Header />
              <div className="flex flex-1">
                <Sidebar />
                {/* Bottom padding keeps every page clear of the mobile bottom bar */}
                <main className="flex-1 overflow-x-hidden pb-(--bottom-nav-height)">
                  {/* While a page's download is on its way, the header and sidebar stay and the page area
                      is blank for a moment */}
                  <Suspense fallback={null}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/library" element={<MovieList />} />
                      <Route path="/tv-shows" element={<TvShowList />} />
                      <Route path="/tv-shows/:id" element={<TvShowRedirect />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/collections" element={<CollectionsView />} />
                      <Route path="/collections/:collectionName" element={<CollectionRedirect />} />
                      <Route path="/genres" element={<GenresView />} />
                      <Route path="/genres/:genreName" element={<GenreDetail />} />
                      <Route path="/movie/:id" element={<MovieRedirect />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/stats" element={<Stats />} />
                      <Route path="/export" element={<CsvExport />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/jellyfin" element={<JellyfinPage />} />
                      {/* Anything else, including the removed shelf, lending and match pages */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
              <BottomNav />
              {/* Toasts from anywhere in the app: toast("...") from "sonner" */}
              <Toaster position="bottom-right" />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
