import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import Counter from '../components/Counter'
import MovieDetailCard from '../components/MovieCardDetail'
import MoviePosterCard from '../components/MovieCardPoster'
import { searchTMDB } from '../utils/tmdbApi'
import type { TMDBMovie, CollectionListItem } from '../types'
import { FaTrash, FaCheck, FaImage, FaEllipsisV  } from 'react-icons/fa'
import { FaTableList, FaChevronDown, FaChevronUp } from "react-icons/fa6";
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import SubNavigation from '../components/SubNavigation'
import type { Movie, Collection } from '../types'

function CollectionDetail() {
  const { collectionName } = useParams<{ collectionName: string }>();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedIsDirector, setEditedIsDirector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Collection list state
  const [listItems, setListItems] = useState<CollectionListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'detail' | 'poster'>(() => {
    const saved = localStorage.getItem('movieViewMode');
    return (saved === 'poster' || saved === 'detail') ? saved : 'detail';
  });
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  
  // Actions dropdown state
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  
  const handleViewModeChange = (mode: 'detail' | 'poster') => {
    setViewMode(mode);
    localStorage.setItem('movieViewMode', mode);
    setIsViewDropdownOpen(false);
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156';
  const MOVIES_URL = `${API_BASE}/api/movies`;
  const COLLECTIONS_URL = `${API_BASE}/api/collections`;

  useEffect(() => {
    fetchMovies();
  }, [collectionName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setIsActionsDropdownOpen(false);
      }
    };

    if (isViewDropdownOpen || isActionsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isViewDropdownOpen, isActionsDropdownOpen]);

  // Close dropdown when editing starts
  useEffect(() => {
    if (isEditing) {
      setIsViewDropdownOpen(false);
      setIsActionsDropdownOpen(false);
    }
  }, [isEditing]);

  const fetchMovies = async () => {
    try {
      const [moviesRes, collectionsRes] = await Promise.all([
        fetch(MOVIES_URL),
        fetch(COLLECTIONS_URL)
      ]);
      
      if (moviesRes.ok) {
        const data = await moviesRes.json();
        const filtered = data.filter((movie: Movie) => 
          movie.collections && movie.collections.includes(collectionName || '')
        );
        setMovies(filtered);
      }
      
      if (collectionsRes.ok) {
        const collectionsData = await collectionsRes.json();
        const foundCollection = collectionsData.find((c: Collection) => c.name === collectionName);
        setCollection(foundCollection || null);
        
        // Fetch list items if collection found
        if (foundCollection) {
          await fetchListItems(foundCollection.id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (collectionId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/collections/${collectionId}/items`);
      if (response.ok) {
        const data = await response.json();
        setListItems(data);
      }
    } catch (error) {
      console.error('Error fetching list items:', error);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedName(collectionName || '');
    setEditedIsDirector(collection?.isDirectorCollection || false);
    setIsActionsDropdownOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!collection || !editedName.trim()) return;

    try {
      const response = await fetch(`${COLLECTIONS_URL}/${collection.id}?newName=${encodeURIComponent(editedName)}&isDirectorCollection=${editedIsDirector}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsEditing(false);
        navigate(`/collections/${encodeURIComponent(editedName)}`);
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName('');
    setEditedIsDirector(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setIsActionsDropdownOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!collection) return;

    try {
      const response = await fetch(`${COLLECTIONS_URL}/${collection.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        navigate('/collections');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    // Wait 300ms after user stops typing
    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchTMDB(value, searchYear);
        setSearchResults(results.slice(0, 10)); // Show top 10 results
      } catch (error) {
        console.error('Error searching TMDB:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleYearChange = (value: string) => {
    setSearchYear(value);

    // Re-search if there's already a search query
    if (searchQuery.length >= 2) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      setIsSearching(true);
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await searchTMDB(searchQuery, value);
          setSearchResults(results.slice(0, 10));
        } catch (error) {
          console.error('Error searching TMDB:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    }
  };

  const handleAddToList = async (movie: TMDBMovie) => {
    if (!collection) return;

    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
    
    try {
      const response = await fetch(`${API_BASE}/api/collections/${collection.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: movie.title,
          year: year,
          tmdbId: movie.id,
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setListItems([...listItems, newItem]);
        setSearchQuery('');
        setSearchYear('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error adding to list:', error);
    }
  };

  const handleRemoveFromList = async (itemId: number) => {
    if (!collection) return;

    try {
      const response = await fetch(`${API_BASE}/api/collections/${collection.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setListItems(listItems.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing from list:', error);
    }
  };

  const isMovieOwned = (title: string, year: number) => {
    return movies.some(m => 
      m.title.toLowerCase() === title.toLowerCase() && m.year === year
    );
  };

  const completionPercentage = listItems.length > 0
    ? Math.round((listItems.filter(item => isMovieOwned(item.title, item.year)).length / listItems.length) * 100)
    : 0;

  if (loading) {
    return (
      <>
        <SubNavigation />
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <SubNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full md:max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-2xl font-bold mb-3"
                  autoFocus
                />
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={editedIsDirector}
                    onChange={(e) => setEditedIsDirector(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Director Collection</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-md transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className='flex items-center gap-4'>
                  <h1 className="text-3xl font-bold mb-2">{collectionName}</h1>
                  <Counter count={movies.length} className="mb-2" />
                  {!isEditing && collection && (
                    <div ref={actionsDropdownRef} className="relative mb-2">
                      <button
                        onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-700 px-2 py-2 rounded-md transition-colors duration-200 cursor-pointer"
                        aria-label="Actions"
                      >
                        <FaEllipsisV className="w-4 h-4" />
                      </button>
                      {isActionsDropdownOpen && (
                        <div className="text-sm absolute left-0 mt-2 w-36 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                          <button
                            onClick={handleEditClick}
                            className="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center gap-3 cursor-pointer"
                          >
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={handleDeleteClick}
                            className="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center gap-3 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={viewDropdownRef} className="ml-auto relative mb-2">
                    <button
                      onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                    >
                      {viewMode === 'poster' ? (
                        <FaImage className="w-5 h-5" />
                      ) : (
                        <FaTableList className="w-5 h-5" />
                      )}
                      {isViewDropdownOpen ? (
                        <FaChevronUp className="w-3 h-3" />
                      ) : (
                        <FaChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {isViewDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-36 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                        <button
                          onClick={() => handleViewModeChange('poster')}
                          className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors flex items-center justify-between border-b border-gray-600 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span>Poster View</span>
                          </div>
                          {viewMode === 'poster' && <FaCheck className="w-4 h-4 text-white" />}
                        </button>
                        <button
                          onClick={() => handleViewModeChange('detail')}
                          className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span>Detail View</span>
                          </div>
                          {viewMode === 'detail' && <FaCheck className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {listItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                    <span>{listItems.length} total in checklist</span>
                    <span>•</span>
                    <span className={completionPercentage === 100 ? 'text-green-400 font-semibold' : ''}>
                      {completionPercentage}% complete
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owned Movies Section */}
      <div>
        {movies.length === 0 ? (
          <EmptyState message="No movies in this collection yet." />
        ) : (
          <div className={viewMode === 'poster' 
            ? "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" 
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          }>
          {movies.sort((a, b) => a.year - b.year).map((movie) => (
            viewMode === 'poster' ? (
              <MoviePosterCard key={movie.id} movie={movie} />
            ) : (
              <MovieDetailCard key={movie.id} movie={movie} showYear />
            )
          ))}
          </div>
        )}
      </div>

      {/* Collection Checklist Manager */}
      {collection && (
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Collection Checklist</h2>

          {/* Search to add movies */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-3 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search TMDB to add movies..."
                  className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={searchYear}
                onChange={(e) => handleYearChange(e.target.value)}
                placeholder="Year (optional)"
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={4}
              />
            </div>
            <div className="relative">

              {/* Search Results - Absolute positioned dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-96 overflow-y-auto">
                  {searchResults.map((movie) => {
                    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                    const alreadyInList = listItems.some(item => item.tmdbId === movie.id);
                    
                    return (
                      <button
                        key={movie.id}
                        onClick={() => !alreadyInList && handleAddToList(movie)}
                        disabled={alreadyInList}
                        className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-600 last:border-b-0 ${
                          alreadyInList 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-600 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt={movie.title}
                              className="w-12 h-18 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-18 bg-gray-600 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{movie.title}</p>
                            <p className="text-gray-400 text-sm">
                              {year}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* List Items */}
          {listItems.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Checklist ({listItems.filter(item => isMovieOwned(item.title, item.year)).length} of {listItems.length})
              </h3>
              <div className="space-y-2">
                {listItems.sort((a, b) => a.year - b.year).map((item) => {
                  const owned = isMovieOwned(item.title, item.year);
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded ${
                        owned ? 'bg-green-900/30 border border-green-700' : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={owned}
                          readOnly
                          className="w-5 h-5 cursor-default"
                        />
                        <div>
                          <span className={`font-medium ${owned ? 'text-green-400' : 'text-white'}`}>
                            {item.title}
                          </span>
                          <span className="text-gray-400 ml-2">({item.year})</span>
                        </div>
                      </div>
                      <button
                        onClick={() => item.id && handleRemoveFromList(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-md transition-colors duration-200 cursor-pointer"
                        aria-label="Remove from checklist"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No items in checklist yet. Search above to add movies!</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Collection"
        message={`Are you sure you want to delete "${collectionName}"? This will remove it from all movies but won't delete the movies themselves.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
    </>
  );
}

export default CollectionDetail;
