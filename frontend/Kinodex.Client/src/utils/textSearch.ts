// Matching a typed search against titles, for lists where the best matches should come first.

// Lower case, without accents, so "Amélie" and "amelie" compare equal
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Letters and digits only, so "Spider-Man" and "spiderman" compare equal
const compact = (text: string) => text.replace(/[^a-z0-9]/g, "");

// How well an item matches a search, from 0 (not at all) to 1. `fields` is what the item can be
// found by, its title first (then e.g. its year and UPCs). Every word typed has to appear in them,
// in any order and possibly inside a longer word, ignoring case, accents and punctuation. Matches
// rank higher when the title starts with the search (1), or one of the title's words starts with
// the first word typed (0.8); any other match is 0.6.
export function searchScore(fields: string[], search: string): number {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  const text = normalize(fields.join(" "));
  const textCompact = compact(text);
  const found = terms.every((term) => text.includes(term) || (compact(term) !== "" && textCompact.includes(compact(term))));
  if (!found) return 0;

  const title = normalize(fields[0] ?? "");
  if (title.startsWith(terms.join(" "))) return 1;
  const firstTerm = compact(terms[0]);
  if (firstTerm && title.split(/[^a-z0-9]+/).some((word) => word.startsWith(firstTerm))) return 0.8;
  return 0.6;
}
