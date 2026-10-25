namespace Kinodex.Api.Models;

public class Collection
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public required string Name { get; set; }
    public bool IsDirectorCollection { get; set; } = false;
    // Director collections: the director's TMDB photo. Null until looked up; empty when TMDB has none.
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
