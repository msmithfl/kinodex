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
      <img
        src="/tmdb-icon.png"
        alt="TMDB"
        className="w-8 h-8 hover:opacity-80 transition-opacity"
      />
    </a>
  );
}

export default TmdbLink;
