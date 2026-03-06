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

type FormatTier = '4k' | 'bluray' | 'dvd' | 'other';

function getFormatTier(formats: string[]): FormatTier {
  const f = formats.map(s => s.toLowerCase());
  if (f.some(s => s.includes('4k') || s.includes('uhd'))) return '4k';
  if (f.some(s => s.includes('blu'))) return 'bluray';
  if (f.some(s => s.includes('dvd'))) return 'dvd';
  return 'other';
}

const PER_ROW = 40;

function MyShelf() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

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

  const rows: Movie[][] = [];
  for (let i = 0; i < movies.length; i += PER_ROW) {
    rows.push(movies.slice(i, i + PER_ROW));
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <SubNavigation />
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <h1 className="text-2xl font-bold">My Shelf</h1>
        </div>

        <div className="space-y-10">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx}>
              {/* Spine row — align to bottom so DVD spines stick up above the rest */}
              <div className="flex items-end gap-0.5">
                {row.map(movie => {
                  const tier = getFormatTier(movie.formats ?? []);
                  const isDvd = tier === 'dvd';
                  const spineHeight = isDvd ? 185 : 160;

                  const notchColor =
                    tier === '4k' ? '#111111' :
                    tier === 'bluray' ? '#1d4ed8' :
                    tier === 'dvd' ? '#6b7280' :
                    '#374151';

                  return (
                    <Link
                      key={movie.id}
                      to={`/movie/${movie.id}`}
                      title={`${movie.title}${tier !== 'other' ? ` (${tier === 'bluray' ? 'Blu-ray' : tier.toUpperCase()})` : ''}`}
                      style={{ flexBasis: `${100 / PER_ROW}%`, flexShrink: 0, flexGrow: 0, height: `${spineHeight + 6}px` }}
                      className={`group relative flex flex-col rounded-t-sm ${getSpineColor(movie.title)} hover:brightness-125 transition-all duration-150 cursor-pointer`}
                    >
                      {/* Format notch */}
                      <div
                        className="w-full rounded-t-sm shrink-0"
                        style={{ height: '20px', backgroundColor: notchColor }}
                      />
                      {/* Spine body with title */}
                      <div className="relative shrink-0 flex items-center justify-center overflow-hidden" style={{ height: `${spineHeight}px` }}>
                        <span
                          className="text-white font-semibold select-none whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            fontSize: 'clamp(7px, 1.8vw, 13px)',
                            maxHeight: `${spineHeight - 8}px`,
                            lineHeight: 1.1,
                          }}
                        >
                          {movie.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}
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
