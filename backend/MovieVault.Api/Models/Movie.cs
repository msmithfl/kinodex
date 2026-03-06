namespace MovieVault.Api.Models;

public class Movie
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string UpcNumber { get; set; }
    public List<string> Formats { get; set; } = new List<string>();
    public List<string> Collections { get; set; } = new List<string>();
    public required string Condition { get; set; }
    public float PurchasePrice { get; set; }
    public bool HasWatched { get; set; } = false;
    public float Rating { get; set; }
    public string Review { get; set; } = string.Empty;
    public int Year { get; set; }
    public List<string> Genres { get; set; } = new List<string>();
    public string PosterPath { get; set; } = string.Empty;
    public string ProductPosterPath { get; set; } = string.Empty;
    public int? TmdbId { get; set; }
    public int HDDriveNumber { get; set; }
    public int ShelfNumber { get; set; }
    public string ShelfSection { get; set; } = string.Empty;
    public bool IsOnPlex { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public List<Checkout> Checkouts { get; set; } = new();
}