import type { JellyfinComparison, JellyfinStreamingUpdate, KinodexTitle, LibraryComparison } from "../../types";

// Update Streaming (docs/design/jellyfin-compare.md): Streaming set from the comparison. A title on
// Jellyfin is streaming and linked to its Jellyfin item (the Jellyfin logo in its drawer); one that isn't,
// isn't. The page previews the changes and the user can leave titles out.

export type TitleKind = "movie" | "show";

// A Kinodex title and what it would become: linked to this Jellyfin item, or null (not on Jellyfin)
export interface StreamingTitle {
  kind: TitleKind;
  title: KinodexTitle;
  jellyfinItemId: string | null;
}

export interface StreamingPlan {
  turnOn: StreamingTitle[]; // On Jellyfin, not marked streaming
  turnOff: StreamingTitle[]; // Marked streaming, not on Jellyfin
  relink: StreamingTitle[]; // Streaming already right, only the Jellyfin link changes (not listed)
}

const libraries = (comparison: JellyfinComparison) =>
  [
    ["movie", comparison.movies],
    ["show", comparison.shows],
  ] as const;

export function planStreaming(comparison: JellyfinComparison): StreamingPlan {
  const plan: StreamingPlan = { turnOn: [], turnOff: [], relink: [] };
  for (const [kind, library] of libraries(comparison)) {
    for (const match of library.inBoth) {
      const change = { kind, title: match.kinodex, jellyfinItemId: match.jellyfin.id };
      if (!match.kinodex.isStreaming) plan.turnOn.push(change);
      else if (match.kinodex.jellyfinItemId !== match.jellyfin.id) plan.relink.push(change);
    }
    for (const title of library.onlyInKinodex) {
      const change = { kind, title, jellyfinItemId: null };
      if (title.isStreaming) plan.turnOff.push(change);
      else if (title.jellyfinItemId) plan.relink.push(change);
    }
  }
  return plan;
}

// Identifies a title across movies and shows (their ids overlap)
export const titleKey = ({ kind, title }: StreamingTitle) => `${kind}:${title.id}`;

// The request for the plan, without the titles the user unticked (left as they are)
export function streamingUpdate(plan: StreamingPlan, skipped: ReadonlySet<string>): JellyfinStreamingUpdate {
  const update: JellyfinStreamingUpdate = { movies: [], shows: [] };
  for (const change of [...plan.turnOn, ...plan.turnOff, ...plan.relink]) {
    if (skipped.has(titleKey(change))) continue;
    (change.kind === "movie" ? update.movies : update.shows).push({
      id: change.title.id,
      jellyfinItemId: change.jellyfinItemId,
    });
  }
  return update;
}

// The comparison as it is once the update is saved, so the page needn't read Jellyfin again
export function withUpdate(comparison: JellyfinComparison, update: JellyfinStreamingUpdate): JellyfinComparison {
  const apply = (library: LibraryComparison, changes: JellyfinStreamingUpdate["movies"]): LibraryComparison => {
    const itemIds = new Map(changes.map((c) => [c.id, c.jellyfinItemId]));
    const updated = (title: KinodexTitle): KinodexTitle => {
      if (!itemIds.has(title.id)) return title;
      const jellyfinItemId = itemIds.get(title.id) ?? null;
      return { ...title, isStreaming: jellyfinItemId !== null, jellyfinItemId };
    };
    return {
      ...library,
      onlyInKinodex: library.onlyInKinodex.map(updated),
      inBoth: library.inBoth.map((match) => ({ ...match, kinodex: updated(match.kinodex) })),
    };
  };
  return {
    ...comparison,
    movies: apply(comparison.movies, update.movies),
    shows: apply(comparison.shows, update.shows),
  };
}
