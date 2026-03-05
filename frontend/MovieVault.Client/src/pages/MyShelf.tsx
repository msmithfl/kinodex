import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SubNavigation from '../components/SubNavigation'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Movie } from '../types'

const SPINE_COLORS = [
  'bg-blue-800',
  'bg-indigo-800',
  'bg-purple-800',
  'bg-teal-800',
  'bg-cyan-800',
  'bg-slate-700',
  'bg-blue-900',
  'bg-violet-800',
  'bg-sky-800',
  'bg-emerald-900',
];

function getSpineColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

const PER_ROW_OPTIONS = [10, 15, 20, 25, 30, 40];

function MyShelf() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [perRow, setPerRow] = useState(20);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156';

  useEffect(() => {
    fetch(`${API_BASE}/api/movies`)
      .then(r => r.json())
      .then((data: Movie[]) => {
        setMovies([...data].sort((a, b) => a.title.localeCompare(b.title)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  // Split movies into rows
  const rows: Movie[][] = [];
  for (let i = 0; i < movies.length; i += perRow) {
    rows.push(movies.slice(i, i + perRow));
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <SubNavigation />
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Shelf</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Per row:</label>
            <select
              value={perRow}
              onChange={e => setPerRow(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PER_ROW_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-10">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx}>
              {/* Shelf board */}
              <div className="flex items-end gap-0.5 pb-0">
                {row.map(movie => (
                  <Link
                    key={movie.id}
                    to={`/movie/${movie.id}`}
                    title={movie.title}
                    style={{ flexBasis: `${100 / perRow}%`, flexShrink: 0, flexGrow: 0 }}
                    className={`group relative flex items-center justify-center rounded-t-sm ${getSpineColor(movie.title)} hover:brightness-125 transition-all duration-150 cursor-pointer`}
                  >
                    {/* Spine height: tall enough to show title sideways */}
                    <div className="w-full" style={{ height: '160px' }}>
                      <div
                        className="absolute inset-0 flex items-center justify-center overflow-hidden"
                      >
                        <span
                          className="text-white font-semibold select-none whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            fontSize: `clamp(8px, ${90 / perRow}vw, 13px)`,
                            maxHeight: '155px',
                            lineHeight: 1.1,
                          }}
                        >
                          {movie.title}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Shelf plank */}
              <div className="h-4 rounded bg-linear-to-b from-amber-700 to-amber-900 shadow-lg" />
              <div className="h-2 rounded-b bg-amber-950 shadow-md" />
            </div>
          ))}
        </div>

        {movies.length === 0 && (
          <p className="text-center text-gray-500 mt-20">No movies in your collection yet.</p>
        )}
      </div>
    </div>
  );
}

export default MyShelf;
