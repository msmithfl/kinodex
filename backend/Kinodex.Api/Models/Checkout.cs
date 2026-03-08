namespace Kinodex.Api.Models;

public class Checkout
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public int CustomerId { get; set; }
    public DateTime CheckedOutDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public DateTime? ReturnedDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    
    // Navigation properties
    public Movie Movie { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    
    // Computed property
    public bool IsOverdue => !ReturnedDate.HasValue && DueDate.HasValue && DueDate < DateTime.UtcNow;
    public bool IsActive => !ReturnedDate.HasValue;
}