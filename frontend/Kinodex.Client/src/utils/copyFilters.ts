import type { Copy } from "../types";
import type { FilterCategory } from "./filterCategories";
import { FORMATS } from "./formats";

// The movie and TV filters that are about a copy, not the title: format, condition, gift, shelf
// section, shelf number and HDD. One copy has to match all the ones chosen (Format: VHS with Shelf
// section: A means a VHS copy on shelf A). A title is shown when any of its copies matches, and the
// table shows only those copies under it, so selecting them never picks one that isn't shown.
const COPY_FILTER_IDS = ["format", "condition", "gift", "shelfSection", "shelfNumber", "hdd"];

type Filters = Record<string, string[]>;

export const hasCopyFilters = (filters: Filters) => COPY_FILTER_IDS.some((id) => filters[id]?.length);

const passes = (filters: Filters, id: string, values: string[]) =>
  !filters[id]?.length || values.some((v) => filters[id].includes(v));

export const copyMatches = (copy: Copy, filters: Filters) =>
  passes(filters, "format", copy.formats) &&
  passes(filters, "condition", [copy.condition]) &&
  passes(filters, "gift", [copy.isGift ? "true" : "false"]) &&
  passes(filters, "shelfSection", [copy.shelfSection]) &&
  passes(filters, "shelfNumber", [String(copy.shelfNumber)]) &&
  passes(filters, "hdd", [String(copy.hdDriveNumber)]);

// The copies the filters let through: all of them when no copy filter is chosen
export const matchingCopies = (copies: Copy[], filters: Filters) =>
  hasCopyFilters(filters) ? copies.filter((c) => copyMatches(c, filters)) : copies;

// Whether a title passes the copy filters: always with none chosen, otherwise when a copy matches
export const titlePassesCopyFilters = (copies: Copy[], filters: Filters) =>
  !hasCopyFilters(filters) || copies.some((c) => copyMatches(c, filters));

// The copy filter categories, with options from the copies there are (and the shelf sections)
export function copyFilterCategories(copies: Copy[], shelfSections: string[]): Record<string, FilterCategory> {
  const numbers = (values: number[]) =>
    Array.from(new Set(values))
      .filter((num) => num > 0)
      .sort((a, b) => a - b);
  return {
    format: {
      id: "format",
      label: "Format",
      kind: "list",
      options: FORMATS.map((format) => ({ label: format, value: format })),
    },
    condition: {
      id: "condition",
      label: "Condition",
      kind: "list",
      options: Array.from(new Set(copies.map((c) => c.condition)))
        .filter(Boolean)
        .sort()
        .map((condition) => ({ label: condition, value: condition })),
    },
    hdd: {
      id: "hdd",
      label: "HDD Number",
      kind: "list",
      options: [
        { label: "No HDD", value: "0" },
        ...numbers(copies.map((c) => c.hdDriveNumber)).map((num) => ({ label: `HDD ${num}`, value: num.toString() })),
      ],
    },
    gift: {
      id: "gift",
      label: "Gift",
      kind: "toggle",
      options: [
        { label: "Gift", value: "true" },
        { label: "Not a gift", value: "false" },
      ],
    },
    shelfSection: {
      id: "shelfSection",
      label: "Shelf Section",
      kind: "list",
      options: shelfSections.map((section) => ({ label: section, value: section })),
    },
    shelfNumber: {
      id: "shelfNumber",
      label: "Shelf Number",
      kind: "list",
      options: [
        { label: "Unshelved", value: "0" },
        ...numbers(copies.map((c) => c.shelfNumber)).map((num) => ({ label: `Shelf ${num}`, value: num.toString() })),
      ],
    },
  };
}
