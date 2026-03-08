import type { Movie } from '../types';

export const applyFilters = (movies: Movie[], selectedFilters: Record<string, string[]>) => {
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
    
    // OnPlex filter
    if (selectedFilters.onPlex && selectedFilters.onPlex.length > 0) {
      filtered = filtered.filter(movie => {
        const isOnPlex = movie.isOnPlex ? 'true' : 'false';
        return selectedFilters.onPlex.includes(isOnPlex);
      });
    }

    // HasWatched filter
    if (selectedFilters.hasWatched && selectedFilters.hasWatched.length > 0) {
      filtered = filtered.filter(movie => {
        const hasWatched = movie.hasWatched ? 'true' : 'false';
        return selectedFilters.hasWatched.includes(hasWatched);
      });
    }
    
    // Shelf Section filter
    if (selectedFilters.shelfSection && selectedFilters.shelfSection.length > 0) {
      filtered = filtered.filter(movie => 
        movie.shelfSection && selectedFilters.shelfSection.includes(movie.shelfSection)
      );
    }
    
    // Shelf Number filter
    if (selectedFilters.shelfNumber && selectedFilters.shelfNumber.length > 0) {
      filtered = filtered.filter(movie => {
        const shelfValue = movie.shelfNumber.toString();
        return selectedFilters.shelfNumber.includes(shelfValue);
      });
    }
    
    // Condition filter
    if (selectedFilters.condition && selectedFilters.condition.length > 0) {
      filtered = filtered.filter(movie => 
        selectedFilters.condition.includes(movie.condition)
      );
    }
    
    return filtered;
  };