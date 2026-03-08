namespace Kinodex.Api.Models;

public class ShelfSection
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
