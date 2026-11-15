import { ExternalLink, Play } from "lucide-react";
import DetailField from "../../components/DetailField";
import { useJellyfinStatus } from "./api";
import { jellyfinItemUrl } from "./urls";

// A drawer's Jellyfin field: Play, opening the title in Jellyfin, once Update Streaming has linked
// it to its Jellyfin item. Nothing for titles that aren't linked.
function JellyfinPlayField({ itemId }: { itemId?: string | null }) {
  const { data: status } = useJellyfinStatus(Boolean(itemId));
  if (!itemId || !status?.connected || !status.serverUrl) return null;

  return (
    <DetailField label="Jellyfin">
      <a
        href={jellyfinItemUrl(status.serverUrl, itemId)}
        target="_blank"
        rel="noreferrer"
        title="Open in Jellyfin"
        className="inline-flex items-center gap-1.5 rounded-sm text-primary-text underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4"
      >
        <Play />
        Play
        <ExternalLink className="size-3.5! text-muted-foreground" aria-hidden="true" />
      </a>
    </DetailField>
  );
}

export default JellyfinPlayField;
