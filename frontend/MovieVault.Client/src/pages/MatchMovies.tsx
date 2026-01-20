import { useState, useEffect } from 'react'
import { FaCheck, FaTimes, FaSync } from 'react-icons/fa'
import SubNavigation from '../components/SubNavigation'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import type { Movie, MatchingResult, MatchSuggestion } from '../types'

function MatchMovies() {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5156';
  
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [unmatchedMovies, setUnmatchedMovies] = useState<Movie[]>([]);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [processing, setProcessing] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchUnmatchedMovies();
  }, []);

  const fetchUnmatchedMovies = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tmdb/unmatched`);
      if (response.ok) {
        const data = await response.json();
        setUnmatchedMovies(data);
      }
    } catch (error) {
      console.error('Error fetching unmatched movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMatching = async () => {
    setMatching(true);
    try {
      const response = await fetch(`${API_BASE}/api/tmdb/match`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setMatchingResult(result);
      }
    } catch (error) {
      console.error('Error running matching:', error);
    } finally {
      setMatching(false);
    }
  };

  const assignMatch = async (movieId: number, tmdbId: number) => {
    setProcessing(prev => new Set(prev).add(movieId));
    
    try {
      const response = await fetch(`${API_BASE}/api/tmdb/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movieId, tmdbId }),
      });

      if (response.ok) {
        // Remove from unmatched list
        setUnmatchedMovies(prev => prev.filter(m => m.id !== movieId));
        
        // Remove from matching results
        if (matchingResult) {
          setMatchingResult({
            ...matchingResult,
            suggestions: matchingResult.suggestions.filter(s => s.movieId !== movieId)
          });
        }
      }
    } catch (error) {
      console.error('Error assigning match:', error);
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(movieId);
        return newSet;
      });
    }
  };

  const skipMatch = (movieId: number) => {
    if (matchingResult) {
      setMatchingResult({
        ...matchingResult,
        suggestions: matchingResult.suggestions.filter(s => s.movieId !== movieId)
      });
    }
  };

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
      <div className="min-h-[calc(100vh-9rem)] px-8 md:px-12 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Match Movies with TMDB</h1>
            <p className="text-gray-400">
              Automatically match your movies with The Movie Database to enable enhanced features like posters, metadata, and collection tracking.
            </p>
          </div>

          {unmatchedMovies.length === 0 ? (
            <EmptyState message="All movies are matched! 🎉" />
          ) : (
            <>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                      {unmatchedMovies.length} Unmatched {unmatchedMovies.length === 1 ? 'Movie' : 'Movies'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Click "Find Matches" to search TMDB for suggestions
                    </p>
                    {matching && (
                      <div className="mt-4 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <FaSync className="animate-spin text-blue-400" />
                          <p className="text-blue-400 font-medium">Searching TMDB...</p>
                        </div>
                        <p className="text-sm text-gray-400">
                          Processing {unmatchedMovies.length} movies (Rate-limited to prevent API throttling)
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Estimated time: ~{Math.ceil(unmatchedMovies.length * 0.25 / 60)} minute{Math.ceil(unmatchedMovies.length * 0.25 / 60) === 1 ? '' : 's'}. Please wait...
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={runMatching}
                    disabled={matching}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-md transition flex items-center gap-2 cursor-pointer whitespace-nowrap h-fit"
                  >
                    <FaSync className={matching ? 'animate-spin' : ''} />
                    {matching ? 'Searching...' : 'Find Matches'}
                  </button>
                </div>
              </div>

              {matchingResult && (
                <div className="mb-6">
                  {matchingResult.success ? (
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                      <p className="text-green-400">{matchingResult.message}</p>
                      {matchingResult.errors.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          <p className="font-semibold mb-1">Errors:</p>
                          <ul className="list-disc list-inside">
                            {matchingResult.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                      <p className="text-red-400">{matchingResult.message}</p>
                    </div>
                  )}
                </div>
              )}

              {matchingResult?.suggestions && matchingResult.suggestions.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Review Suggestions</h2>
                  {matchingResult.suggestions.map((suggestion) => (
                    <MatchSuggestionCard
                      key={suggestion.movieId}
                      suggestion={suggestion}
                      onAssign={assignMatch}
                      onSkip={skipMatch}
                      isProcessing={processing.has(suggestion.movieId)}
                    />
                  ))}
                </div>
              )}

              {!matchingResult && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Unmatched Movies</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unmatchedMovies.map((movie) => (
                      <div key={movie.id} className="bg-gray-700 rounded-lg p-4">
                        <p className="font-medium">{movie.title}</p>
                        <p className="text-gray-400 text-sm">({movie.year})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

interface MatchSuggestionCardProps {
  suggestion: MatchSuggestion;
  onAssign: (movieId: number, tmdbId: number) => void;
  onSkip: (movieId: number) => void;
  isProcessing: boolean;
}

function MatchSuggestionCard({ suggestion, onAssign, onSkip, isProcessing }: MatchSuggestionCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">
          {suggestion.movieTitle} ({suggestion.movieYear})
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          Found {suggestion.suggestedMatches.length} possible {suggestion.suggestedMatches.length === 1 ? 'match' : 'matches'}
        </p>
      </div>

      <div className="space-y-3">
        {suggestion.suggestedMatches.map((match) => (
          <div
            key={match.tmdbId}
            className="bg-gray-700 rounded-lg p-4 flex items-start gap-4"
          >
            {match.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${match.posterPath}`}
                alt={match.title}
                className="w-16 h-24 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-24 bg-gray-600 rounded flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white">{match.title}</h4>
              {match.year && (
                <p className="text-gray-400 text-sm">Year: {match.year}</p>
              )}
              {match.overview && (
                <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                  {match.overview}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onAssign(suggestion.movieId, match.tmdbId)}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition flex items-center gap-2 cursor-pointer"
                title="Accept this match"
              >
                <FaCheck />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-600">
        <button
          onClick={() => onSkip(suggestion.movieId)}
          disabled={isProcessing}
          className="text-gray-400 hover:text-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed transition flex items-center gap-2 cursor-pointer"
        >
          <FaTimes />
          Skip this movie
        </button>
      </div>
    </div>
  );
}

export default MatchMovies;
