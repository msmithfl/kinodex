import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { FaPlus, FaUndo, FaTrash, FaClock, FaExclamationTriangle } from 'react-icons/fa'
import { LuClipboardPen } from 'react-icons/lu'
import { getRelativeTimeString } from '../utils/dateUtils'
import type { Checkout, Customer, Movie } from '../types'

function CheckoutsView() {
  const [checkouts, setCheckouts] = useState<Checkout[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReturnConfirm, setShowReturnConfirm] = useState<Checkout | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Checkout | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  
  const getDefaultDueDate = () => {
    const twoWeeks = new Date()
    twoWeeks.setDate(twoWeeks.getDate() + 14)
    return twoWeeks.toISOString().split('T')[0]
  }
  
  const [formData, setFormData] = useState({
    movieId: 0,
    customerId: 0,
    dueDate: getDefaultDueDate(),
    notes: '',
  })
  const [error, setError] = useState('')

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156'

  useEffect(() => {
    fetchCheckouts()
    fetchCustomers()
    fetchMovies()
  }, [])

  const fetchCheckouts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/checkouts`)
      if (response.ok) {
        const data = await response.json()
        setCheckouts(data)
      }
    } catch (error) {
      console.error('Error fetching checkouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/customers`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchMovies = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/movies`)
      if (response.ok) {
        const data = await response.json()
        // Only show movies that aren't currently checked out
        const checkedOutMovieIds = new Set(
          checkouts.filter(ch => !ch.returnedDate).map(ch => ch.movieId)
        )
        setMovies(data.filter((m: Movie) => !checkedOutMovieIds.has(m.id!)))
      }
    } catch (error) {
      console.error('Error fetching movies:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.movieId || !formData.customerId) {
      setError('Please select both a movie and a customer')
      return
    }

    try {
      const checkoutData = {
        movieId: formData.movieId,
        customerId: formData.customerId,
        checkedOutDate: new Date().toISOString(),
        dueDate: formData.dueDate ? formData.dueDate : null,
        notes: formData.notes,
      }
      
      console.log('Sending checkout data:', checkoutData)

      const response = await fetch(`${API_BASE}/api/checkouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData),
      })

      if (response.ok) {
        await fetchCheckouts()
        await fetchMovies()
        handleCloseModal()
      } else {
        let errorMessage = 'Failed to create checkout'
        const text = await response.text()
        try {
          const data = JSON.parse(text)
          errorMessage = data.message || errorMessage
        } catch {
          console.error('Backend error:', text)
          errorMessage = `Server error (${response.status})`
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      setError('An error occurred while creating checkout')
    }
  }

  const handleReturn = async () => {
    if (!showReturnConfirm?.id) return

    try {
      const response = await fetch(`${API_BASE}/api/checkouts/${showReturnConfirm.id}/return`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchCheckouts()
        await fetchMovies()
        setShowReturnConfirm(null)
      } else {
        setError('Failed to return movie')
      }
    } catch (error) {
      console.error('Error returning movie:', error)
      setError('An error occurred while returning movie')
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm?.id) return

    try {
      const response = await fetch(`${API_BASE}/api/checkouts/${showDeleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCheckouts()
        setShowDeleteConfirm(null)
      } else {
        setError('Failed to delete checkout')
      }
    } catch (error) {
      console.error('Error deleting checkout:', error)
      setError('An error occurred while deleting')
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setFormData({ movieId: 0, customerId: 0, dueDate: getDefaultDueDate(), notes: '' })
    setError('')
  }

  const isOverdue = (checkout: Checkout) => {
    if (checkout.returnedDate || !checkout.dueDate) return false
    return new Date(checkout.dueDate) < new Date()
  }

  const getFilteredCheckouts = () => {
    let filtered = checkouts

    // Apply status filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(ch => !ch.returnedDate)
        break
      case 'overdue':
        filtered = filtered.filter(ch => isOverdue(ch))
        break
      case 'returned':
        filtered = filtered.filter(ch => ch.returnedDate)
        break
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(ch =>
        ch.movie?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }

  const filteredCheckouts = getFilteredCheckouts()
  const activeCount = checkouts.filter(ch => !ch.returnedDate).length
  const overdueCount = checkouts.filter(ch => isOverdue(ch)).length

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <LuClipboardPen className="text-indigo-400" />
            Checkouts
          </h1>
          <div className="flex gap-4 mt-2 text-sm">
            <p className="text-gray-400">
              {activeCount} active
            </p>
            {overdueCount > 0 && (
              <p className="text-red-400 flex items-center gap-1">
                <FaExclamationTriangle />
                {overdueCount} overdue
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <FaPlus />
          New Checkout
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'overdue', 'returned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by movie or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Checkouts List */}
      {filteredCheckouts.length === 0 ? (
        <EmptyState
          message={searchQuery ? "No checkouts found. Try adjusting your search." : "No checkouts yet. Start checking out movies to your customers."}
          showAddButton={false}
        />
      ) : (
        <div className="space-y-4">
          {filteredCheckouts.map((checkout) => {
            const overdue = isOverdue(checkout)
            return (
              <div
                key={checkout.id}
                className={`bg-gray-800 border rounded-lg p-6 ${
                  overdue
                    ? 'border-red-500'
                    : checkout.returnedDate
                    ? 'border-gray-700'
                    : 'border-indigo-500/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {checkout.movie?.posterPath && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${checkout.movie.posterPath}`}
                          alt={checkout.movie.title}
                          className="w-16 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to={`/movie/${checkout.movieId}`}
                              className="text-xl font-semibold text-white hover:text-indigo-400 transition-colors"
                            >
                              {checkout.movie?.title || 'Unknown Movie'}
                            </Link>
                            {checkout.movie?.year && (
                              <span className="text-gray-400 ml-2">({checkout.movie.year})</span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-400 mt-1">
                          Checked out to: <span className="text-white">{checkout.customer?.name || 'Unknown'}</span>
                        </p>
                        
                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1 text-gray-400">
                            <FaClock />
                            Checked out {getRelativeTimeString(checkout.checkedOutDate)}
                          </div>
                          {checkout.dueDate && (
                            <div className={`flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
                              {overdue && <FaExclamationTriangle />}
                              Due {getRelativeTimeString(checkout.dueDate)}
                            </div>
                          )}
                          {checkout.returnedDate && (
                            <div className="flex items-center gap-1 text-green-400">
                              ✓ Returned {getRelativeTimeString(checkout.returnedDate)}
                            </div>
                          )}
                        </div>

                        {checkout.notes && (
                          <p className="mt-2 text-sm text-gray-400 italic">
                            Note: {checkout.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!checkout.returnedDate && (
                      <button
                        onClick={() => setShowReturnConfirm(checkout)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <FaUndo />
                        Return
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(checkout)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete checkout"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Checkout Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">New Checkout</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Customer <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value={0}>Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Movie <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.movieId}
                  onChange={(e) => setFormData({ ...formData, movieId: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value={0}>Select a movie...</option>
                  {movies.map((movie) => (
                    <option key={movie.id} value={movie.id}>
                      {movie.title} {movie.year && `(${movie.year})`}
                    </option>
                  ))}
                </select>
                {movies.length === 0 && (
                  <p className="text-sm text-yellow-400 mt-1">
                    All movies are currently checked out
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={getTodayDate()}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Optional notes..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Create Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Confirmation */}
      <ConfirmDialog
        isOpen={showReturnConfirm !== null}
        title="Return Movie"
        message={showReturnConfirm ? `Mark "${showReturnConfirm.movie?.title}" as returned from ${showReturnConfirm.customer?.name}?` : ''}
        onConfirm={handleReturn}
        onCancel={() => setShowReturnConfirm(null)}
        confirmText="Return"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        title="Delete Checkout"
        message="Are you sure you want to delete this checkout record? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(null)}
        confirmText="Delete"
      />
    </div>
  )
}

export default CheckoutsView
