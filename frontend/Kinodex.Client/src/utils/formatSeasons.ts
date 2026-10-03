// Short label for the seasons a user owns, e.g. "Complete", "S1–3, S5", or "-" when none
export const formatSeasons = (seasons: number[], totalSeasons: number): string => {
  if (seasons.length === 0) return "-";

  const sorted = [...new Set(seasons)].sort((a, b) => a - b);
  if (totalSeasons > 0 && sorted.length === totalSeasons) return "Complete";

  // Collapse runs of consecutive seasons into ranges
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const season of sorted.slice(1).concat(Number.NaN)) {
    if (season === prev + 1) {
      prev = season;
      continue;
    }
    ranges.push(start === prev ? `S${start}` : `S${start}–${prev}`);
    start = season;
    prev = season;
  }
  return ranges.join(", ");
};
