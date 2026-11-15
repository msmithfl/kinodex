import { useJellyfinStatus } from "./api";
import { jellyfinItemUrl } from "./urls";

// The Jellyfin logo beside a drawer's TMDB logo, opening the title in Jellyfin, once Update
// Streaming has linked it to its Jellyfin item. Nothing for titles that aren't linked.
function JellyfinLink({ itemId }: { itemId?: string | null }) {
  const { data: status } = useJellyfinStatus(Boolean(itemId));
  if (!itemId || !status?.connected || !status.serverUrl) return null;

  return (
    <a
      href={jellyfinItemUrl(status.serverUrl, itemId)}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0"
      title="Open in Jellyfin"
    >
      <img src="/jellyfin-icon.png" alt="Jellyfin" className="h-8 w-8 transition-opacity hover:opacity-80" />
    </a>
  );
}

export default JellyfinLink;
