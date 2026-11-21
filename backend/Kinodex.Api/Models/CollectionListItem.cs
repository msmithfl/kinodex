namespace Kinodex.Api.Models;

public class CollectionListItem
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int CollectionId { get; set; }
    public required string Title { get; set; }
    public int Year { get; set; }
    public int? TmdbId { get; set; }  // Optional TMDB reference
    // "movie" or "show": TMDB numbers movies and shows separately, so the id alone is not enough
    public string Kind { get; set; } = TitleKinds.Movie;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public Collection? Collection { get; set; }
}
