namespace MovieVault.Api.Models;

public class User
{
    public string Id { get; set; } = string.Empty; // Clerk user ID
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
