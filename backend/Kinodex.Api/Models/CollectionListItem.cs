namespace Kinodex.Api.Models;

public class CollectionListItem
{
    public int Id { get; set; }
    public int CollectionId { get; set; }
    public required string Title { get; set; }
    public int Year { get; set; }
    public int? TmdbId { get; set; }  // Optional TMDB reference
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public Collection? Collection { get; set; }
}
