namespace Kinodex.Api.Models;

public class Collection
{
    public int Id { get; set; }
    public required string UserId { get; set; }
    public required string Name { get; set; }
    public bool IsDirectorCollection { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
