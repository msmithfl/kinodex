namespace Kinodex.Api.Models;

public class Collection
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public required string Name { get; set; }
    public bool IsDirectorCollection { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
