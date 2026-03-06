import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BarcodeScanner from '../components/BarcodeScanner';
import ProductImageSelector from '../components/ProductImageSelector';
import MovieForm from '../components/MovieForm';
import type { Movie, TMDBMovie } from "../types";
import { GENRE_MAP, searchTMDB } from '../utils/tmdbApi';
import { MobileOnlyMessage } from '../components/MobileOnlyMessage';

function AddMovie() {
  const navigate = useNavigate();
  const [entryMode, setEntryMode] = useState<'choice' | 'manual' | 'search'>('choice');
  const [search, setSearch] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [suggestions, setSuggestions] = useState<TMDBMovie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const [formData, setFormData] = useState<Movie>({
    title: '',
    upcNumber: '',
    formats: [],
    collections: [],
    condition: 'Like New',
    purchasePrice: 0,
    hasWatched: false,
    rating: 0,
    review: '',
    year: new Date().getFullYear(),
    genres: [],
    posterPath: '',
    productPosterPath: '',
    tmdbId: undefined,
    hdDriveNumber: 0,
    shelfNumber: 1,
    shelfSection: '',
    isOnPlex: true
  });
  
  const [collections, setCollections] = useState<{id: number, name: string}[]>([]);
  const [shelfSections, setShelfSections] = useState<{id: number, name: string}[]>([]);
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [showShelfSectionInput, setShowShelfSectionInput] = useState(false);
  const [newCollection, setNewCollection] = useState('');
  const [newShelfSection, setNewShelfSection] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showProductImageSelector, setShowProductImageSelector] = useState(false);
  const [scannedUpc, setScannedUpc] = useState('');
  const [showManualUpcInput, setShowManualUpcInput] = useState(false);
  const [manualUpc, setManualUpc] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156';
  const API_URL = `${API_BASE}/api/movies`;
  const COLLECTIONS_URL = `${API_BASE}/api/collections`;
  const SHELF_SECTIONS_URL = `${API_BASE}/api/shelfsections`;
  // const TMDB_API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN;
  
  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };
  
  useEffect(() => {
    // Load collections and shelf sections from API
    const fetchData = async () => {
      try {
        const [collectionsRes, shelfSectionsRes] = await Promise.all([
          fetch(COLLECTIONS_URL),
          fetch(SHELF_SECTIONS_URL)
        ]);
        
        if (collectionsRes.ok) {
          const collectionsData = await collectionsRes.json();
          setCollections(collectionsData);
        }
        
        if (shelfSectionsRes.ok) {
          const shelfSectionsData = await shelfSectionsRes.json();
          setShelfSections(shelfSectionsData);
        }
      } catch (error) {
        console.error('Error loading collections and shelf sections:', error);
      }
    };
    
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Navigate back to library page after successful add
        navigate('/');
      }
    } catch (error) {
      console.error('Error adding movie:', error);
    }
  };
  
  const addCollection = async () => {
    if (newCollection && !collections.find(c => c.name === newCollection)) {
      try {
        const response = await fetch(COLLECTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newCollection }),
        });
        
        if (response.ok) {
          const newCollectionData = await response.json();
          setCollections([...collections, newCollectionData].sort((a, b) => a.name.localeCompare(b.name)));
          setFormData({ ...formData, collections: [...formData.collections, newCollection] });
          setNewCollection('');
          setShowCollectionInput(false);
        }
      } catch (error) {
        console.error('Error adding collection:', error);
      }
    }
  };
  
  const addShelfSection = async () => {
    if (newShelfSection && !shelfSections.find(s => s.name === newShelfSection)) {
      try {
        const response = await fetch(SHELF_SECTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newShelfSection }),
        });
        
        if (response.ok) {
          const newShelfSectionData = await response.json();
          setShelfSections([...shelfSections, newShelfSectionData].sort((a, b) => a.name.localeCompare(b.name)));
          setFormData({ ...formData, shelfSection: newShelfSection });
          setNewShelfSection('');
          setShowShelfSectionInput(false);
        }
      } catch (error) {
        console.error('Error adding shelf section:', error);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Wait 300ms after user stops typing
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await searchTMDB(value, searchYear);
        setSuggestions(results.slice(0, 5));
        setShowSuggestions(true);
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 300);
  };

  const handleYearChange = (value: string) => {
    setSearchYear(value);

    // Re-search if there's already a search query
    if (search.length >= 2) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await searchTMDB(search, value);
          setSuggestions(results.slice(0, 5));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error searching TMDB:', error);
          setSuggestions([]);
        }
      }, 300);
    }
  };

  const handleMovieSelect = (movie: TMDBMovie) => {
    // Map genre IDs to genre names
    const genres = movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
    
    // Extract year from release date
    const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear();
    
    // Construct poster URL
    const posterPath = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';

    // Update form data with TMDB info including TMDB ID
    setFormData({
      ...formData,
      title: movie.title,
      year,
      genres,
      posterPath,
      tmdbId: movie.id
    });

    // Switch to manual entry mode
    setEntryMode('manual');
    setSearch('');
    setSearchYear('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData({ ...formData, upcNumber: code });
    setScannedUpc(code);
    setShowScanner(false);
    setShowProductImageSelector(true);
  };

  const handleProductImageSelect = (imageUrl: string) => {
    setFormData({ ...formData, productPosterPath: imageUrl });
    setShowProductImageSelector(false);
    setScannedUpc('');
  };

  const handleProductImageSkip = () => {
    setShowProductImageSelector(false);
    setScannedUpc('');
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleManualSearchClick = () => {
    setManualUpc(formData.upcNumber);
    setShowManualUpcInput(true);
  };

  const handleManualUpcSearch = () => {
    if (manualUpc.trim()) {
      setScannedUpc(manualUpc);
      setShowManualUpcInput(false);
      setShowProductImageSelector(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors cursor-pointer"
        >
          ← Back to Library
        </button>
      </div>

      {entryMode === 'choice' && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Add New Movie</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setEntryMode('search')}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-8 transition-all duration-200 transform hover:scale-105 text-center cursor-pointer"
            >
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">Find By Title</h3>
              <p className="text-gray-400 text-sm">Search for movie information online</p>
            </button>

            <button
              onClick={() => setEntryMode('manual')}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-8 transition-all duration-200 transform hover:scale-105 text-center cursor-pointer"
            >
              <div className="text-5xl mb-4">✏️</div>
              <h3 className="text-xl font-semibold mb-2">Manual Entry</h3>
              <p className="text-gray-400 text-sm">Enter all details manually</p>
            </button>
          </div>
        </div>
      )}

      {entryMode === 'search' && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <button
              onClick={() => setEntryMode('choice')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              ← Back to Choice
            </button>
          </div>
          <h2 className="text-3xl font-bold mb-6">Find By Title</h2>
          
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-3 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search for a movie..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
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
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-96 overflow-y-auto">
                  {suggestions.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => handleMovieSelect(movie)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
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
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {search.length >= 2 && suggestions.length === 0 && showSuggestions && (
            <div className="text-center py-12">
              <p className="text-gray-400">No movies found. Try a different search.</p>
            </div>
          )}

          {search.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Start typing to search for a movie...</p>
            </div>
          )}
        </div>
      )}

      {entryMode === 'manual' && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <button
              onClick={() => setEntryMode('choice')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              ← Back to Choice
            </button>
          </div>
          <h2 className="text-3xl font-bold mb-6">Manual Entry</h2>
          <MovieForm
            formData={formData}
            setFormData={setFormData}
            collections={collections}
            shelfSections={shelfSections}
            showCollectionInput={showCollectionInput}
            setShowCollectionInput={setShowCollectionInput}
            showShelfSectionInput={showShelfSectionInput}
            setShowShelfSectionInput={setShowShelfSectionInput}
            newCollection={newCollection}
            setNewCollection={setNewCollection}
            newShelfSection={newShelfSection}
            setNewShelfSection={setNewShelfSection}
            addCollection={addCollection}
            addShelfSection={addShelfSection}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/')}
            submitButtonText="Add to Collection"
            showScanButton={true}
            onScanClick={handleScanClick}
            onManualSearchClick={handleManualSearchClick}
          />
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showProductImageSelector && scannedUpc && (
        <ProductImageSelector
          upc={scannedUpc}
          onSelect={handleProductImageSelect}
          onSkip={handleProductImageSkip}
          onClose={handleProductImageSkip}
        />
      )}

      {showManualUpcInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Search Product Images</h3>
              <button
                onClick={() => setShowManualUpcInput(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-gray-300 mb-4">Enter UPC code to search for product images:</p>
            <input
              type="text"
              value={manualUpc}
              onChange={(e) => setManualUpc(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualUpcSearch()}
              placeholder="Enter UPC code"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={handleManualUpcSearch}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition font-semibold"
              >
                Search
              </button>
              <button
                onClick={() => setShowManualUpcInput(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMobileOnlyMessage && (
        <MobileOnlyMessage setShowMobileOnlyMessage={setShowMobileOnlyMessage} />
      )}
    </div>
  )
}

export default AddMovie
