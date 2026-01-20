import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
// import Footer from './components/Footer'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import MovieList from './pages/MovieList'
import AddMovie from './pages/AddMovie'
import EditMovie from './pages/EditMovie'
import MovieDetail from './pages/MovieDetail'
import CollectionsView from './pages/CollectionsView'
import CollectionDetail from './pages/CollectionDetail'
import ShelfSectionsView from './pages/ShelfSectionsView'
import ShelfSectionDetail from './pages/ShelfSectionDetail'
import GenresView from './pages/GenresView'
import GenreDetail from './pages/GenreDetail'
import MatchMovies from './pages/MatchMovies'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<MovieList />} />
              <Route path="/collections" element={<CollectionsView />} />
              <Route path="/collections/:collectionName" element={<CollectionDetail />} />
              <Route path="/shelfsections" element={<ShelfSectionsView />} />
              <Route path="/shelfsections/:sectionName" element={<ShelfSectionDetail />} />
              <Route path="/genres" element={<GenresView />} />
              <Route path="/genres/:genreName" element={<GenreDetail />} />
              <Route path="/match-movies" element={<MatchMovies />} />
              <Route path="/add" element={<AddMovie />} />
              <Route path="/movie/:id" element={<MovieDetail />} />
              <Route path="/edit/:id" element={<EditMovie />} />
            </Routes>
          </main>
        </div>
        {/* <Footer /> */}
      </div>
    </Router>
  )
}

export default App

