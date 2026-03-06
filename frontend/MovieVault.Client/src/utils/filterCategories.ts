import type { Movie } from '../types';

export function buildFilterCategories(
  movies: Movie[],
  shelfSections: string[],
  collections: string[]
) {
  return [
    {
      id: 'format',
      label: 'Format',
      options: [
        { label: '4K', value: '4K' },
        { label: 'Blu-ray', value: 'Blu-ray' },
        { label: 'DVD', value: 'DVD' },
        { label: 'VHS', value: 'VHS' },
      ],
    },
    {
      id: 'condition',
      label: 'Condition',
      options: Array.from(new Set(movies.map(m => m.condition)))
        .sort()
        .map(condition => ({ label: condition, value: condition })),
    },
    {
      id: 'hdd',
      label: 'HDD Number',
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
      options: collections.map(collection => ({ label: collection, value: collection })),
    },
    {
      id: 'onPlex',
      label: 'On Plex',
      options: [
        { label: 'On Plex', value: 'true' },
        { label: 'Not on Plex', value: 'false' },
      ],
    },
    {
      id: 'hasWatched',
      label: 'Has Watched',
      options: [
        { label: 'Watched', value: 'true' },
        { label: 'Not Watched', value: 'false' },
      ],
    },
    {
      id: 'shelfSection',
      label: 'Shelf Section',
      options: shelfSections.map(section => ({ label: section, value: section })),
    },
    {
      id: 'shelfNumber',
      label: 'Shelf Number',
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