namespace Kinodex.Api.Models;

public class Customer
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // The user who lends to this customer
    public required string Name { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public List<Checkout> Checkouts { get; set; } = new();
}