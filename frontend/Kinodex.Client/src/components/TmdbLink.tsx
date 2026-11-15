// The TMDB logo, linking to the title's TMDB page (or TMDB's home page when it has no TMDB id)
function TmdbLink({ kind, tmdbId }: { kind: "movie" | "tv"; tmdbId?: number | null }) {
  return (
    <a
      href={tmdbId ? `https://www.themoviedb.org/${kind}/${tmdbId}` : "https://www.themoviedb.org/"}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0"
      title={tmdbId ? "View on TMDB" : "Search on TMDB"}
    >
      {/* The image has a transparent margin round its tile (a tenth each side), so it's scaled up
          to make the tile as big as the Jellyfin logo beside it; scaling leaves the space it
          takes up alone, so nothing else moves */}
      <img
        src="/tmdb-icon.png"
        alt="TMDB"
        className="w-8 h-8 scale-125 hover:opacity-80 transition-opacity"
      />
    </a>
  );
}

export default TmdbLink;
