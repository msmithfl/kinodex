namespace Kinodex.Api.Models;

public class Collection
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public required string Name { get; set; }
    public bool IsDirectorCollection { get; set; } = false;
    // Cover chosen when the collection was created: a movie poster, or the director's TMDB photo
    public string? ImageUrl { get; set; }
    // Wide image behind the collection's details, taken from one of the user's movies
    public string? BackdropUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
