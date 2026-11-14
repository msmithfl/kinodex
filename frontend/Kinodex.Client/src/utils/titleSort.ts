// Titles in order the way shelves and libraries file them: a leading "A", "An" or "The" doesn't
// count ("The Thing" goes under T), and neither does case. The title itself is never changed,
// only what it's sorted by.
const LEADING_ARTICLE = /^(?:the|an|a)\s+/i;

export const sortTitle = (title: string) => title.trim().replace(LEADING_ARTICLE, "");

// For .sort(): by the title without its article, then the full title so "The Thing" and "Thing"
// always come out in the same order
export const compareTitles = (a: string, b: string) =>
  sortTitle(a).localeCompare(sortTitle(b)) || a.localeCompare(b);
