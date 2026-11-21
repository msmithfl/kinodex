import type { Movie } from '../types';
import { copyFilterCategories } from './copyFilters';

export interface FilterOption {
  label: string;
  value: string;
}

// How the filter panel shows a category: an Any / Yes / No switch (options "true" and "false"),
// or a row that opens a checklist
export type FilterKind = 'toggle' | 'list';

export interface FilterCategory {
  id: string;
  label: string;
  options: FilterOption[];
  kind?: FilterKind;
}

export function buildFilterCategories(
  movies: Movie[],
  shelfSections: string[],
  collections: string[]
): FilterCategory[] {
  const copy = copyFilterCategories(movies.flatMap(m => m.copies), shelfSections);
  return [
    copy.format,
    {
      // Every genre that appears in the collection
      id: 'genre',
      label: 'Genre',
      kind: 'list',
      options: Array.from(new Set(movies.flatMap(m => m.genres ?? [])))
        .sort()
        .map(genre => ({ label: genre, value: genre })),
    },
    copy.condition,
    copy.hdd,
    {
      id: 'collection',
      label: 'Collection',
      kind: 'list',
      options: collections.map(collection => ({ label: collection, value: collection })),
    },
    {
      id: 'streaming',
      label: 'Streaming',
      kind: 'toggle',
      options: [
        { label: 'Streaming', value: 'true' },
        { label: 'Not streaming', value: 'false' },
      ],
    },
    {
      id: 'hasWatched',
      label: 'Has Watched',
      kind: 'toggle',
      options: [
        { label: 'Watched', value: 'true' },
        { label: 'Not Watched', value: 'false' },
      ],
    },
    copy.gift,
    copy.shelfSection,
    copy.shelfNumber,
  ];
}
