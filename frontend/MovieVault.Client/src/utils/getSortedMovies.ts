import type { Movie, SortOption } from '../types'

export const getSortedMovies = (movies: Movie[], sortBy: SortOption, sortDirection: 'asc' | 'desc') => {
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
        case 'purchasePrice':
          sortedMovies.sort((a, b) => {
            const aPrice = a.purchasePrice || 0;
            const bPrice = b.purchasePrice || 0;
            return aPrice - bPrice;
          });
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