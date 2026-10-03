namespace Kinodex.Api.Models;

public class TvShow
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // Clerk user ID
    public required string Title { get; set; }
    public bool HasWatched { get; set; } = false;
    public float Rating { get; set; }
    public string Review { get; set; } = string.Empty;
    public int Year { get; set; } // First air year
    public List<string> Genres { get; set; } = new List<string>();
    public string PosterPath { get; set; } = string.Empty;
    public string BackdropPath { get; set; } = string.Empty;
    public string ProductPosterPath { get; set; } = string.Empty;
    public int? TmdbId { get; set; }
    public int TotalSeasons { get; set; } // Season count from TMDB, 0 when unknown
    public bool IsOnPlex { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Owned seasons, total paid and "complete" are all derived from these
    public List<TvShowPurchase> Purchases { get; set; } = new();
}
