import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import MovieList from "./pages/MovieList";
import EditMovie from "./pages/EditMovie";
import MovieDetail from "./pages/MovieDetail";
import CollectionsView from "./pages/CollectionsView";
import CollectionDetail from "./pages/CollectionDetail";
import ShelfSectionsView from "./pages/ShelfSectionsView";
import ShelfSectionDetail from "./pages/ShelfSectionDetail";
import GenresView from "./pages/GenresView";
import GenreDetail from "./pages/GenreDetail";
import MatchMovies from "./pages/MatchMovies";
import CustomersView from "./pages/CustomersView";
import CheckoutsView from "./pages/CheckoutsView";
import MyShelf from "./pages/MyShelf";
import Stats from "./pages/Stats";
import CsvExport from "./pages/CsvExport";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";

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
            <div className="min-h-screen bg-gray-900 text-white flex flex-col">
              <Header />
              <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 overflow-x-hidden">
                  <Routes>
                    <Route path="/" element={<MovieList />} />
                    <Route path="/my-shelf" element={<MyShelf />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/collections" element={<CollectionsView />} />
                    <Route path="/collections/:collectionName" element={<CollectionDetail />} />
                    <Route path="/shelfsections" element={<ShelfSectionsView />} />
                    <Route path="/shelfsections/:sectionName" element={<ShelfSectionDetail />} />
                    <Route path="/genres" element={<GenresView />} />
                    <Route path="/genres/:genreName" element={<GenreDetail />} />
                    <Route path="/match-movies" element={<MatchMovies />} />
                    <Route path="/checkout" element={<CheckoutsView />} />
                    <Route path="/customer" element={<CustomersView />} />
                    <Route path="/movie/:id" element={<MovieDetail />} />
                    <Route path="/edit/:id" element={<EditMovie />} />
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/export" element={<CsvExport />} />
                  </Routes>
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
