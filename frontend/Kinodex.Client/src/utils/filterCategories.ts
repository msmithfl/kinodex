import type { Movie } from '../types';
import { FORMATS } from './formats';

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
  return [
    {
      id: 'format',
      label: 'Format',
      kind: 'list',
      options: FORMATS.map(format => ({ label: format, value: format })),
    },
    {
      // Every genre that appears in the collection
      id: 'genre',
      label: 'Genre',
      kind: 'list',
      options: Array.from(new Set(movies.flatMap(m => m.genres ?? [])))
        .sort()
        .map(genre => ({ label: genre, value: genre })),
    },
    {
      id: 'condition',
      label: 'Condition',
      kind: 'list',
      options: Array.from(new Set(movies.map(m => m.condition)))
        .sort()
        .map(condition => ({ label: condition, value: condition })),
    },
    {
      id: 'hdd',
      label: 'HDD Number',
      kind: 'list',
      options: [
        { label: 'No HDD', value: '0' },
        ...Array.from(new Set(movies.map(m => m.hdDriveNumber)))
          .filter(num => num > 0)
          .sort((a, b) => a - b)
          .map(num => ({ label: `HDD ${num}`, value: num.toString() })),
      ],
    },
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
    {
      id: 'gift',
      label: 'Gift',
      kind: 'toggle',
      options: [
        { label: 'Gift', value: 'true' },
        { label: 'Not a gift', value: 'false' },
      ],
    },
    {
      id: 'shelfSection',
      label: 'Shelf Section',
      kind: 'list',
      options: shelfSections.map(section => ({ label: section, value: section })),
    },
    {
      id: 'shelfNumber',
      label: 'Shelf Number',
      kind: 'list',
      options: [
        { label: 'Unshelved', value: '0' },
        ...Array.from(new Set(movies.map(m => m.shelfNumber)))
          .filter(num => num > 0)
          .sort((a, b) => a - b)
          .map(num => ({ label: `Shelf ${num}`, value: num.toString() })),
      ],
    },
  ];
}
