import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Movie } from '../types'

function Stats() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156'
  const API_URL = `${API_BASE}/api/movies`

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(API_URL)
        if (response.ok) {
          const data: Movie[] = await response.json()
          setMovies(data)
        }
      } catch (error) {
        console.error('Error fetching movies:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMovies()
  }, [])

  const watched = movies.filter(m => m.hasWatched).length
  const notWatched = movies.length - watched

  const watchedData = [
    { name: 'Watched', value: watched },
    { name: 'Not Watched', value: notWatched },
  ]

  const formatData = (() => {
    const counts: Record<string, number> = {}
    movies.forEach(m => {
      m.formats.forEach(fmt => {
        counts[fmt] = (counts[fmt] || 0) + 1
      })
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  })()

  const genreData = (() => {
    const counts: Record<string, number> = {}
    movies.forEach(m => {
      m.genres.forEach(g => {
        counts[g] = (counts[g] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  })()

  const conditionData = (() => {
    const counts: Record<string, number> = {}
    movies.forEach(m => {
      counts[m.condition] = (counts[m.condition] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  })()

  const WATCHED_COLORS = ['#6366f1', '#374151']
  const FORMAT_COLORS = ['#06b6d4', '#8b5cf6', '#a855f7', '#ec4899']
  const GENRE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e']
  const CONDITION_COLORS = ['#22c55e', '#6366f1', '#eab308', '#f97316', '#ef4444']

  const totalSpend = movies.reduce((sum, m) => sum + (m.purchasePrice || 0), 0)
  const avgRating = movies.filter(m => m.rating > 0).length > 0
    ? movies.filter(m => m.rating > 0).reduce((sum, m) => sum + m.rating, 0) / movies.filter(m => m.rating > 0).length
    : 0

  const onPlexCount = movies.filter(m => m.isOnPlex).length

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
    const cxN = cx as number
    const cyN = cy as number
    const midAngleN = midAngle as number
    const innerR = innerRadius as number
    const outerR = outerRadius as number
    const pct = percent as number
    if (pct < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerR + (outerR - innerR) * 0.5
    const x = cxN + radius * Math.cos(-midAngleN * RADIAN)
    const y = cyN + radius * Math.sin(-midAngleN * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
        {`${(pct * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Collection Statistics</h1>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">Total Movies</p>
              <p className="text-4xl font-bold text-white">{movies.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">Total Spent</p>
              <p className="text-4xl font-bold text-green-400">${totalSpend.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">Avg Rating</p>
              <p className="text-4xl font-bold text-yellow-400">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 text-center">
              <p className="text-gray-400 text-sm mb-1">On Plex</p>
              <p className="text-4xl font-bold text-indigo-400">{onPlexCount}</p>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Watched / Not Watched donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Watched vs Not Watched</h2>
              {movies.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={watchedData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {watchedData.map((_, index) => (
                        <Cell key={index} fill={WATCHED_COLORS[index % WATCHED_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number | undefined) => [`${value ?? 0} movie${(value ?? 0) !== 1 ? 's' : ''}`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-around mt-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-400">{watched}</p>
                  <p className="text-gray-400 text-sm">Watched</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">{notWatched}</p>
                  <p className="text-gray-400 text-sm">Not Watched</p>
                </div>
              </div>
            </div>

            {/* Formats donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Formats</h2>
              {formatData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {formatData.map((_, index) => (
                        <Cell key={index} fill={FORMAT_COLORS[index % FORMAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '8px', color: '#fff' }}
                      formatter={(value: number | undefined) => [`${value ?? 0} movie${(value ?? 0) !== 1 ? 's' : ''}`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Genres donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Top Genres</h2>
              {genreData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {genreData.map((_, index) => (
                        <Cell key={index} fill={GENRE_COLORS[index % GENRE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '8px', color: '#000' }}
                      formatter={(value: number | undefined) => [`${value ?? 0} movie${(value ?? 0) !== 1 ? 's' : ''}`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Condition donut */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Condition</h2>
              {conditionData.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={conditionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {conditionData.map((_, index) => (
                        <Cell key={index} fill={CONDITION_COLORS[index % CONDITION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '8px', color: '#000' }}
                      formatter={(value: number | undefined) => [`${value ?? 0} movie${(value ?? 0) !== 1 ? 's' : ''}`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#d1d5db' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Stats
