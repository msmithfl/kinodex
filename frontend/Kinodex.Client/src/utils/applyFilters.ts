import type { Movie } from '../types';
import { titlePassesCopyFilters } from './copyFilters';

// The movie list's filters. Genre, collection, streaming and watched are about the movie; format,
// condition, gift, shelf and HDD are about its copies (utils/copyFilters).
export const applyFilters = <T extends Movie>(movies: T[], selectedFilters: Record<string, string[]>): T[] => {
  const chosen = (id: string) => selectedFilters[id]?.length ? selectedFilters[id] : null;
  const yesNo = (value: boolean) => (value ? 'true' : 'false');

  return movies.filter(movie => {
    const genre = chosen('genre');
    if (genre && !(movie.genres ?? []).some(g => genre.includes(g))) return false;
    const collection = chosen('collection');
    if (collection && !movie.collections.some(c => collection.includes(c))) return false;
    const streaming = chosen('streaming');
    if (streaming && !streaming.includes(yesNo(movie.isStreaming))) return false;
    const watched = chosen('hasWatched');
    if (watched && !watched.includes(yesNo(movie.hasWatched))) return false;
    return titlePassesCopyFilters(movie.copies, selectedFilters);
  });
};
