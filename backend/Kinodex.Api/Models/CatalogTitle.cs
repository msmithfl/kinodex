namespace Kinodex.Api.Models;

// The two kinds of title, as stored in Titles.Kind (and CollectionListItem.Kind)
public static class TitleKinds
{
    public const string Movie = "movie";
    public const string Show = "show";

    public static bool IsKnown(string kind) => kind is Movie or Show;
}

// A film or show in the user's library, with every physical copy of it (docs/design/titles-and-copies.md).
// Movies and TV shows share one table (Titles), told apart by its Kind column ("movie" or "show");
// db.Movies and db.TvShows each read only their own kind.
public abstract class CatalogTitle
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // Clerk user ID
    public required string Title { get; set; }
    public int Year { get; set; } // A show's first air year
    public List<string> Genres { get; set; } = new List<string>();
    public List<string> Collections { get; set; } = new List<string>(); // Collection names
    public string PosterPath { get; set; } = string.Empty;
    public string BackdropPath { get; set; } = string.Empty;
    public int? TmdbId { get; set; } // TMDB numbers movies and shows separately
    public bool HasWatched { get; set; } = false;
    public float Rating { get; set; }
    public string Review { get; set; } = string.Empty;
    public bool IsStreaming { get; set; } = false;
    // The matching item on the user's Jellyfin server, saved by Update Streaming and when a title is
    // added (for the drawer's Jellyfin link); null when not linked. Cleared when Jellyfin is
    // disconnected or the server changes.
    public string? JellyfinItemId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // The discs, tapes and sets the user has of it; format, price, shelf and so on are per copy
    public List<Copy> Copies { get; set; } = new();
}
