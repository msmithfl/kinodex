// A picker's options matching what's typed (anywhere in the name, ignoring case), those starting
// with it first and otherwise in their own order; every option when nothing is typed (ChipSelect)
export function matchOptions<T extends { value: string; label?: string }>(options: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const name = (o: T) => (o.label ?? o.value).toLowerCase();
  const starts = (o: T) => name(o).startsWith(q);
  return options.filter((o) => name(o).includes(q)).sort((a, b) => Number(starts(b)) - Number(starts(a)));
}
