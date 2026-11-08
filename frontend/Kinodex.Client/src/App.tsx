import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import MovieList from "./pages/MovieList";
import TvShowList from "./pages/TvShowList";
import CollectionsView from "./pages/CollectionsView";
import GenresView from "./pages/GenresView";
import GenreDetail from "./pages/GenreDetail";
import Stats from "./pages/Stats";
import SearchPage from "./pages/SearchPage";
import Settings from "./pages/Settings";
import CsvExport from "./pages/CsvExport";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import { Toaster } from "@/components/ui/sonner";

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
            <div className="min-h-screen bg-background text-foreground flex flex-col">
              <Header />
              <div className="flex flex-1">
                <Sidebar />
                {/* Bottom padding keeps every page clear of the mobile bottom bar */}
                <main className="flex-1 overflow-x-hidden pb-(--bottom-nav-height)">
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
                    {/* Anything else, including the removed shelf, lending and match pages */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
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
