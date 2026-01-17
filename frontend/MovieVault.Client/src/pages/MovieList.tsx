import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Counter from '../components/Counter';
import BarcodeScanner from '../components/BarcodeScanner'
import LoadingSpinner from '../components/LoadingSpinner';
import SortableTableHeader from '../components/SortableTableHeader';
import FilterDropdown from '../components/FilterDropdown';
import ConfirmDialog from '../components/ConfirmDialog';
import SubNavigation from '../components/SubNavigation';
import { FaSortAmountDown, FaPencilAlt, FaTrash, FaRegCircle, FaCheckCircle } from "react-icons/fa";
import { FaMagnifyingGlass, FaCheck } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";
import { LuTable2 } from "react-icons/lu";
import { MdClose } from "react-icons/md";
import { TiStarOutline, TiStarHalfOutline, TiStarFullOutline } from 'react-icons/ti'
import { IoCameraOutline } from "react-icons/io5";
import { getRelativeTimeString } from '../utils/dateUtils';
import EmptyState from '../components/EmptyState';
import { MobileOnlyMessage } from '../components/MobileOnlyMessage';
import type { Movie } from '../types'

type SortOption = 'date' | 'alphabetic' | 'format' | 'year' | 'condition' | 'rating';

interface VisibleColumns {
  year: boolean;
  format: boolean;
  condition: boolean;
  rating: boolean;
  dateAdded: boolean;
}

function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('movieListSortBy');
    return (saved as SortOption) || 'alphabetic';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('movieListSortDirection');
    return (saved as 'asc' | 'desc') || 'asc';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [upcSearchQuery, setUpcSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
    const saved = localStorage.getItem('movieListColumns');
    return saved ? JSON.parse(saved) : {
      year: true,
      format: true,
      condition: true,
      rating: true,
      dateAdded: true,
    };
  });
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<number>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    shelfNumber: '',
    shelfSection: '',
    hdDriveNumber: ''
  });
  const [shelfSections, setShelfSections] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156';
  const API_URL = `${API_BASE}/api/movies`;

  // Check if device is mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  useEffect(() => {
    fetchMovies();
    fetchShelfSections();
    fetchCollections();
  }, []);

  // Save column preferences to localStorage
  useEffect(() => {
    localStorage.setItem('movieListColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save sorting preferences to localStorage
  useEffect(() => {
    localStorage.setItem('movieListSortBy', sortBy);
    localStorage.setItem('movieListSortDirection', sortDirection);
  }, [sortBy, sortDirection]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const fetchMovies = async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setMovies(data);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShelfSections = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/shelfsections`);
      if (response.ok) {
        const data = await response.json();
        setShelfSections(data.map((section: any) => section.name).sort());
      }
    } catch (error) {
      console.error('Error fetching shelf sections:', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/collections`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.map((collection: any) => collection.name).sort());
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const getSortedMovies = () => {
    const sortedMovies = [...movies];
    
    switch (sortBy) {
      case 'alphabetic':
        sortedMovies.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'year':
        sortedMovies.sort((a, b) => (a.year || 0) - (b.year || 0));
        break;
      case 'format':
        sortedMovies.sort((a, b) => {
          // Get first format alphabetically (4K < Blu-ray < DVD)
          const aFormat = a.formats.length > 0 ? [...a.formats].sort()[0] : 'ZZZ';
          const bFormat = b.formats.length > 0 ? [...b.formats].sort()[0] : 'ZZZ';
          return aFormat.localeCompare(bFormat);
        });
        break;
      case 'condition':
        sortedMovies.sort((a, b) => a.condition.localeCompare(b.condition));
        break;
      case 'rating':
        sortedMovies.sort((a, b) => a.rating - b.rating);
        break;
      case 'date':
      default:
        sortedMovies.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;
    }

    // Apply sort direction
    if (sortDirection === 'desc') {
      sortedMovies.reverse();
    }

    return sortedMovies;
  };

  const sortedMovies = getSortedMovies();
  
  // Apply filters
  const applyFilters = (movies: Movie[]) => {
    let filtered = [...movies];
    
    // Format filter
    if (selectedFilters.format && selectedFilters.format.length > 0) {
      filtered = filtered.filter(movie => 
        movie.formats.some(format => selectedFilters.format.includes(format))
      );
    }
    
    // HDD Number filter
    if (selectedFilters.hdd && selectedFilters.hdd.length > 0) {
      filtered = filtered.filter(movie => {
        const hddValue = movie.hdDriveNumber.toString();
        const hasNoHDD = movie.hdDriveNumber === 0;
        return selectedFilters.hdd.includes(hddValue) || 
               (selectedFilters.hdd.includes('0') && hasNoHDD);
      });
    }
    
    // Collection filter
    if (selectedFilters.collection && selectedFilters.collection.length > 0) {
      filtered = filtered.filter(movie => 
        movie.collections.some(collection => selectedFilters.collection.includes(collection))
      );
    }
    
    return filtered;
  };
  
  // Filter movies by search query and filters
  const filteredMovies = applyFilters(sortedMovies).filter(movie => {
    const matchesTitle = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUpc = movie.upcNumber.toLowerCase().includes(upcSearchQuery.toLowerCase());
    return matchesTitle && matchesUpc;
  });
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovies = filteredMovies.slice(startIndex, endIndex);
  
  // Reset to page 1 when changing items per page or sort
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleColumnClick = (sortKey: string) => {
    const column = sortKey as SortOption;
    if (column === sortBy) {
      // Same column, toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, set it and default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleUpcSearchChange = (value: string) => {
    setUpcSearchQuery(value);
    setCurrentPage(1);
  };

  const handleScanClick = () => {
    if (isMobile()) {
      setShowScanner(true);
    } else {
      setShowMobileOnlyMessage(true);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    setUpcSearchQuery(code);
    setShowScanner(false);
    setCurrentPage(1);
  };

  const toggleColumn = (column: keyof VisibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleFilterChange = (categoryId: string, values: string[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      [categoryId]: values
    }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedFilters({});
    setCurrentPage(1);
  };

  const handleDeselectAll = () => {
    setSelectedMovieIds(new Set());
  };

  const handleCheckboxChange = (movieId: number | undefined, checked: boolean) => {
    if (movieId === undefined) return;
    
    setSelectedMovieIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(movieId);
      } else {
        newSet.delete(movieId);
      }
      return newSet;
    });
  };

  const handleBulkEdit = async () => {
    try {
      const updates: Partial<Movie> = {};
      
      if (bulkEditData.shelfNumber !== '') {
        updates.shelfNumber = parseInt(bulkEditData.shelfNumber);
      }
      if (bulkEditData.shelfSection !== '') {
        updates.shelfSection = bulkEditData.shelfSection;
      }
      if (bulkEditData.hdDriveNumber !== '') {
        updates.hdDriveNumber = parseInt(bulkEditData.hdDriveNumber);
      }

      // Update each selected movie
      const updatePromises = Array.from(selectedMovieIds).map(async (movieId) => {
        const movie = movies.find(m => m.id === movieId);
        if (!movie) return;

        const updatedMovie = { ...movie, ...updates };
        const response = await fetch(`${API_URL}/${movieId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedMovie)
        });

        if (!response.ok) throw new Error(`Failed to update movie ${movieId}`);
      });

      await Promise.all(updatePromises);
      
      // Refresh the movie list
      await fetchMovies();
      
      // Reset state
      setShowBulkEditModal(false);
      setSelectedMovieIds(new Set());
      setBulkEditData({ shelfNumber: '', shelfSection: '', hdDriveNumber: '' });
    } catch (error) {
      console.error('Error updating movies:', error);
      alert('Failed to update movies. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedMovieIds).map(async (movieId) => {
        const response = await fetch(`${API_URL}/${movieId}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error(`Failed to delete movie ${movieId}`);
      });

      await Promise.all(deletePromises);
      
      // Refresh the movie list
      await fetchMovies();
      
      // Reset state
      setShowDeleteConfirm(false);
      setSelectedMovieIds(new Set());
    } catch (error) {
      console.error('Error deleting movies:', error);
      alert('Failed to delete movies. Please try again.');
    }
  };

  // Define filter categories
  const filterCategories = [
    {
      id: 'format',
      label: 'Format',
      options: [
        { label: '4K', value: '4K' },
        { label: 'Blu-ray', value: 'Blu-ray' },
        { label: 'DVD', value: 'DVD' },
        { label: 'VHS', value: 'VHS' },
      ]
    },
    {
      id: 'hdd',
      label: 'HDD Number',
      options: [
        { label: 'No HDD', value: '0' },
        ...Array.from(new Set(movies.map(m => m.hdDriveNumber)))
          .filter(num => num > 0)
          .sort((a, b) => a - b)
          .map(num => ({ label: `HDD ${num}`, value: num.toString() }))
      ]
    },
    {
      id: 'collection',
      label: 'Collection',
      options: collections.map(collection => ({ label: collection, value: collection }))
    }
  ];

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
      <div className="mx-auto">
          <div className="flex justify-between items-center mb-8">
            {/* Mobile Sort and Column Buttons */}
            {movies.length > 0 && (
              <div className="md:hidden flex gap-2">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="p-2 text-gray-300 hover:text-white transition-colors"
                  aria-label="Sort options"
                >
                  <FaSortAmountDown className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

      {movies.length > 0 && (
        <div className="mb-4 mx-12 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <FaMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by UPC..."
                value={upcSearchQuery}
                onChange={(e) => handleUpcSearchChange(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleScanClick}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition cursor-pointer flex items-center justify-center"
                title="Scan barcode"
              >
                <IoCameraOutline className="w-6 h-6" />  
              </button>
            </div>
          </div>
          
          {/* Desktop Sort Controls - Conditionally Visible */}
          {selectedMovieIds.size === 0 ? (
            <div className="hidden md:flex items-center justify-between gap-6">
              <div className='flex items-center gap-4'>
                <div className="relative">
                  {Object.values(selectedFilters).some(arr => arr.length > 0) && (
                    <button
                    onClick={handleClearFilters}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                    title="Clear filters"
                    >
                      <IoMdCloseCircle className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}
                  <div onClick={() => setShowColumnMenu(false)}>
                    <FilterDropdown
                      categories={filterCategories}
                      selectedFilters={selectedFilters}
                      onFilterChange={handleFilterChange}
                      />
                  </div>
                </div>
                <Counter count={filteredMovies.length} />
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-300">
                  Per page:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="text-sm px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-between py-1 px-6 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <span className="text-yellow-400 font-medium">
                <FaCheck className="inline w-4 h-4 mr-1 -mt-1" /> 
                {selectedMovieIds.size} selected
              </span>
              
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                  title="Edit selected movies"
                >
                  <FaPencilAlt className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                  title="Delete selected movies"
                >
                  <FaTrash className="w-5 h-5" />
                </button>
              </div>
              
              <button
                onClick={handleDeselectAll}
                className="px-4 py-1.5 text-sm text-yellow-400 hover:text-yellow-300 hover:border-yellow-500 rounded transition-colors cursor-pointer"
              >
                <MdClose className="inline w-4 h-4 mr-1 -mt-1" />
                Deselect All
              </button>
            </div>
          )}

          {/* Mobile Sort Controls - Toggle Visibility */}
          {showSortMenu && (
            <div className="md:hidden space-y-3 p-4 bg-gray-700 rounded-lg">
              <div className="flex flex-col gap-2">
                <label htmlFor="itemsPerPage-mobile" className="text-sm font-medium text-gray-300">
                  Per page:
                </label>
                <select
                  id="itemsPerPage-mobile"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="text-sm px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500 cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {movies.length === 0 ? (
        <EmptyState message="No movies in your collection yet." />
      ) : (
        <div className="bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 py-2 w-12 border-r border-gray-600">
                    <div className="relative">
                      <button
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        className="flex text-gray-300 hover:text-white transition-colors cursor-pointer items-center"
                        aria-label="Column options"
                      >
                        <LuTable2 className="w-5 h-5" />
                      </button>
                      {showColumnMenu && (
                        <div className="text-sm absolute -left-1 mt-2 w-40 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10">
                          <div className="">
                            <button
                              onClick={() => toggleColumn('year')}
                              className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-3 py-2 rounded"
                            >
                              <span className={`font-normal ${visibleColumns.year ? 'text-indigo-400' : 'text-white'}`}>Year</span>
                              {visibleColumns.year && <FaCheck className="w-5 h-5 text-indigo-400" />}
                            </button>
                            <button
                              onClick={() => toggleColumn('format')}
                              className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-3 py-2 rounded"
                            >
                              <span className={`font-normal ${visibleColumns.format ? 'text-indigo-400' : 'text-white'}`}>Format</span>
                              {visibleColumns.format && <FaCheck className="w-5 h-5 text-indigo-400" />}
                            </button>
                            <button
                              onClick={() => toggleColumn('condition')}
                              className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-3 py-2 rounded"
                            >
                              <span className={`font-normal ${visibleColumns.condition ? 'text-indigo-400' : 'text-white'}`}>Condition</span>
                              {visibleColumns.condition && <FaCheck className="w-5 h-5 text-indigo-400" />}
                            </button>
                            <button
                              onClick={() => toggleColumn('rating')}
                              className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-3 py-2 rounded"
                            >
                              <span className={`font-normal ${visibleColumns.rating ? 'text-indigo-400' : 'text-white'}`}>Rating</span>
                              {visibleColumns.rating && <FaCheck className="w-5 h-5 text-indigo-400" />}
                            </button>
                            <button
                              onClick={() => toggleColumn('dateAdded')}
                              className="w-full flex items-center justify-between cursor-pointer hover:bg-gray-700 px-3 py-2 rounded"
                            >
                              <span className={`font-normal ${visibleColumns.dateAdded ? 'text-indigo-400' : 'text-white'}`}>Date Added</span>
                              {visibleColumns.dateAdded && <FaCheck className="w-5 h-5 text-indigo-400" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <SortableTableHeader
                    label="Title"
                    sortKey="alphabetic"
                    currentSortBy={sortBy}
                    sortDirection={sortDirection}
                    onClick={handleColumnClick}
                    className="w-46 max-w-46 md:w-96 md:max-w-96"
                  />
                  {visibleColumns.year && (
                    <SortableTableHeader
                      label="Year"
                      sortKey="year"
                      currentSortBy={sortBy}
                      sortDirection={sortDirection}
                      onClick={handleColumnClick}
                    />
                  )}
                  {visibleColumns.format && (
                    <SortableTableHeader
                      label="Format"
                      sortKey="format"
                      currentSortBy={sortBy}
                      sortDirection={sortDirection}
                      onClick={handleColumnClick}
                    />
                  )}
                  {visibleColumns.condition && (
                    <SortableTableHeader
                      label="Condition"
                      sortKey="condition"
                      currentSortBy={sortBy}
                      sortDirection={sortDirection}
                      onClick={handleColumnClick}
                    />
                  )}
                  {visibleColumns.rating && (
                    <SortableTableHeader
                      label="Rating"
                      sortKey="rating"
                      currentSortBy={sortBy}
                      sortDirection={sortDirection}
                      onClick={handleColumnClick}
                      className="pl-6"
                    />
                  )}
                  {visibleColumns.dateAdded && (
                    <SortableTableHeader
                      label="Date Added"
                      sortKey="date"
                      currentSortBy={sortBy}
                      sortDirection={sortDirection}
                      onClick={handleColumnClick}
                      className="pr-10"
                    />
                  )}
                </tr>
              </thead>
              <tbody>
              {currentMovies.map((movie, index) => (
                <tr 
                  key={movie.id}
                  className={`text-sm group ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'} hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus-within:outline-none`}
                >
                  <td 
                    className="w-12 text-center bg-gray-900"
                    onClick={() => handleCheckboxChange(movie.id, !selectedMovieIds.has(movie.id || 0))}
                  >
                    {selectedMovieIds.has(movie.id || 0) ? (
                      <FaCheckCircle className="w-5 h-5 text-indigo-500 inline-block" />
                    ) : (
                      <FaRegCircle className={`w-4 h-4 text-gray-500 transition-opacity opacity-0 group-hover:opacity-100 inline-block`} />
                    )}
                  </td>
                  <td className="px-6 py-2 text-white w-46 max-w-46 md:w-96 md:max-w-96 align-middle">
                    <Link to={`/movie/${movie.id}`} className="hover:underline transition-colors inline-block truncate max-w-full align-middle" title={movie.title}>
                      {movie.title}
                    </Link>
                  </td>
                  {visibleColumns.year && (
                    <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                      {movie.year || '-'}
                    </td>
                  )}
                  {visibleColumns.format && (
                    <td className="px-6 py-2 whitespace-nowrap align-middle">
                      {movie.formats && movie.formats.length > 0 ? (
                        <div className="flex gap-1">
                          {[...movie.formats].sort().map((fmt, idx) => (
                            <span key={idx} className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                              {fmt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.condition && (
                    <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">{movie.condition}</td>
                  )}
                  {visibleColumns.rating && (
                    <td className="pl-6 py-2 whitespace-nowrap align-middle">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFullStar = movie.rating >= star;
                          const isHalfStar = movie.rating === star - 0.5;
                          
                          return (
                            <div key={star}>
                              {isFullStar ? (
                                <TiStarFullOutline className="w-5 h-5 text-yellow-400" />
                              ) : isHalfStar ? (
                                <TiStarHalfOutline className="w-5 h-5 text-yellow-400" />
                              ) : (
                                <TiStarOutline className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  )}
                  {visibleColumns.dateAdded && (
                    <td className="px-6 py-2 text-gray-300 whitespace-nowrap align-middle">
                      {getRelativeTimeString(movie.createdAt)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedMovies.length)} of {sortedMovies.length} movies
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Previous
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || 
                                    page === totalPages || 
                                    (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    const showEllipsis = (page === currentPage - 2 && currentPage > 3) ||
                                        (page === currentPage + 2 && currentPage < totalPages - 2);
                    
                    if (showEllipsis) {
                      return <span key={page} className="px-3 py-2 text-gray-400">...</span>;
                    }
                    
                    if (!showPage) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-md transition cursor-pointer ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-800 border border-gray-600 text-white hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showMobileOnlyMessage && (
        <MobileOnlyMessage setShowMobileOnlyMessage={setShowMobileOnlyMessage} />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-75"
            onClick={() => setShowBulkEditModal(false)}
          />
          
          <div className="relative bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-3">
                Bulk Edit {selectedMovieIds.size} Movie{selectedMovieIds.size !== 1 ? 's' : ''}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Leave fields empty to keep their current values
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="bulk-shelf-number" className="block text-sm font-medium text-gray-300 mb-2">
                    Shelf Number
                  </label>
                  <input
                    id="bulk-shelf-number"
                    type="number"
                    value={bulkEditData.shelfNumber}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, shelfNumber: e.target.value }))}
                    placeholder="Enter shelf number"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="bulk-shelf-section" className="block text-sm font-medium text-gray-300 mb-2">
                    Shelf Section
                  </label>
                  <select
                    id="bulk-shelf-section"
                    value={bulkEditData.shelfSection}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, shelfSection: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="">-- Keep Current --</option>
                    {shelfSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="bulk-hdd-number" className="block text-sm font-medium text-gray-300 mb-2">
                    HDD Number
                  </label>
                  <input
                    id="bulk-hdd-number"
                    type="number"
                    value={bulkEditData.hdDriveNumber}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, hdDriveNumber: e.target.value }))}
                    placeholder="Enter HDD number"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowBulkEditModal(false);
                    setBulkEditData({ shelfNumber: '', shelfSection: '', hdDriveNumber: '' });
                  }}
                  className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkEdit}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition cursor-pointer"
                >
                  Update Movies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Movies"
        message={`Are you sure you want to delete ${selectedMovieIds.size} movie${selectedMovieIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
    </>
  )
}

export default MovieList;
