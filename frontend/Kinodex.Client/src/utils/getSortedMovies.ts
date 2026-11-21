import type { Copy, SortOption } from '../types'
import { compareTitles } from './titleSort'
import { allConditions, allFormats, lastAdded, totalPaid } from './copies'

// What sorting reads: a movie or a TV show (both titles with copies)
interface Sortable {
  title: string;
  year: number;
  rating: number;
  createdAt?: string;
  copies: Copy[];
}

// Format, condition and price come from the copies: the first format alphabetically, the first
// copy's condition, the total paid. "Date added" is when the title was last added to (its newest
// copy), so a new copy of something already owned sorts with the new arrivals.
export const getSortedMovies = <T extends Sortable>(movies: T[], sortBy: SortOption, sortDirection: 'asc' | 'desc'): T[] => {
    const sortedMovies = [...movies];

    switch (sortBy) {
      case 'alphabetic':
        // Ignoring a leading A, An or The (utils/titleSort)
        sortedMovies.sort((a, b) => compareTitles(a.title, b.title));
        break;
      case 'year':
        sortedMovies.sort((a, b) => (a.year || 0) - (b.year || 0));
        break;
      case 'format': {
        // First format alphabetically (4K < Blu-ray < DVD); none sorts last
        const first = (m: T) => allFormats(m.copies)[0] ?? 'ZZZ';
        sortedMovies.sort((a, b) => first(a).localeCompare(first(b)));
        break;
      }
      case 'condition': {
        const condition = (m: T) => allConditions(m.copies)[0] ?? '';
        sortedMovies.sort((a, b) => condition(a).localeCompare(condition(b)));
        break;
      }
      case 'rating':
        sortedMovies.sort((a, b) => a.rating - b.rating);
        break;
      case 'purchasePrice':
        sortedMovies.sort((a, b) => totalPaid(a.copies) - totalPaid(b.copies));
        break;
      case 'date':
      default:
        sortedMovies.sort((a, b) => {
          const aAdded = lastAdded(a);
          const bAdded = lastAdded(b);
          if (!aAdded || !bAdded) return 0;
          return new Date(aAdded).getTime() - new Date(bAdded).getTime();
        });
        break;
    }

    // Apply sort direction
    if (sortDirection === 'desc') {
      sortedMovies.reverse();
    }

    return sortedMovies;
  };
