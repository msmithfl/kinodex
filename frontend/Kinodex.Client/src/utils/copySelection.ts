import type { Copy } from "../types";
import { copyCount } from "./copies";

// What's ticked in the movie table (docs/design/titles-and-copies.md): copies, by id, and titles
// with no copies (there's nothing else of theirs to tick), by id. A title's checkbox ticks its
// copies, so bulk edit and delete can work on copies: one HDD number never lands on both a VHS and
// a Blu-ray unless both were chosen.
export interface CopySelection {
  copyIds: ReadonlySet<number>;
  titleIds: ReadonlySet<number>;
}

export const NO_SELECTION: CopySelection = { copyIds: new Set(), titleIds: new Set() };

interface Title {
  id?: number;
  copies: Copy[];
}

// A title as a table shows it: with the copies the filters let through (all of them, with none on)
export interface TitleRow<T extends Title> {
  title: T;
  copies: Copy[];
}

const idsOf = (copies: Copy[]) => copies.flatMap((c) => (c.id === undefined ? [] : [c.id]));

export const isEmpty = (selection: CopySelection) => selection.copyIds.size === 0 && selection.titleIds.size === 0;

// A title row's checkbox: ticked when all its shown copies are (or, with none, when it is itself),
// a dash when only some are
export function rowChecked<T extends Title>(row: TitleRow<T>, selection: CopySelection): boolean | "indeterminate" {
  if (row.copies.length === 0) return row.title.id !== undefined && selection.titleIds.has(row.title.id);
  const ids = idsOf(row.copies);
  const ticked = ids.filter((id) => selection.copyIds.has(id)).length;
  return ticked === 0 ? false : ticked === ids.length ? true : "indeterminate";
}

const set = (ids: Set<number>, id: number, on: boolean) => (on ? ids.add(id) : ids.delete(id));

// Ticks or unticks whole rows: each one's shown copies, or a title with none itself
export function selectRows<T extends Title>(selection: CopySelection, rows: TitleRow<T>[], on: boolean): CopySelection {
  const copyIds = new Set(selection.copyIds);
  const titleIds = new Set(selection.titleIds);
  for (const row of rows) {
    if (row.copies.length > 0) idsOf(row.copies).forEach((id) => set(copyIds, id, on));
    else if (row.title.id !== undefined) set(titleIds, row.title.id, on);
  }
  return { copyIds, titleIds };
}

export function selectCopy(selection: CopySelection, copyId: number, on: boolean): CopySelection {
  const copyIds = new Set(selection.copyIds);
  set(copyIds, copyId, on);
  return { copyIds, titleIds: selection.titleIds };
}

// A title something of is ticked: with its ticked copies. whole: all of its copies are ticked (or
// it has none and is ticked itself), so deleting removes the title rather than some copies.
export interface Picked<T> {
  title: T;
  copies: Copy[];
  whole: boolean;
}

export function pickedTitles<T extends Title>(titles: T[], selection: CopySelection): Picked<T>[] {
  return titles.flatMap((title) => {
    if (title.copies.length === 0) {
      return title.id !== undefined && selection.titleIds.has(title.id) ? [{ title, copies: [], whole: true }] : [];
    }
    const copies = title.copies.filter((c) => c.id !== undefined && selection.copyIds.has(c.id));
    return copies.length === 0 ? [] : [{ title, copies, whole: copies.length === title.copies.length }];
  });
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// What a bulk edit changes: "12 copies of 9 movies"
export function describeEdit<T extends Title>(picked: Picked<T>[], noun = "movie") {
  const copies = picked.reduce((sum, p) => sum + p.copies.length, 0);
  return `${copyCount(copies)} of ${count(picked.length, noun)}`;
}

// What a bulk delete removes: "3 movies and 2 copies of Die Hard", "5 copies from 2 movies"
export function describeDelete<T extends Title & { title: string }>(picked: Picked<T>[], noun = "movie") {
  const whole = picked.filter((p) => p.whole);
  const partial = picked.filter((p) => !p.whole);
  const partialCopies = partial.reduce((sum, p) => sum + p.copies.length, 0);
  const parts = [
    whole.length > 0 ? count(whole.length, noun) : null,
    partial.length === 1
      ? `${copyCount(partialCopies)} of ${partial[0].title.title}`
      : partial.length > 1
        ? `${copyCount(partialCopies)} from ${count(partial.length, noun)}`
        : null,
  ];
  return parts.filter(Boolean).join(" and ");
}
