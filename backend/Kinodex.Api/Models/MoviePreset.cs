namespace Kinodex.Api.Models;

// A named set of Add Movie values for batches of similar movies (e.g. "Bookstore": DVD, $1,
// watched). It holds every field TMDB doesn't fill in (so not title, year, genres, poster, backdrop
// or TMDB id). Picking one in the Add Movie modal fills those fields as saved, blanks included.
public class MoviePreset
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public required string Name { get; set; } // Unique per user
    public string UpcNumber { get; set; } = string.Empty; // e.g. one barcode for a whole box set
    public List<string> Collections { get; set; } = new List<string>();
    public List<string> Formats { get; set; } = new List<string>();
    public string Condition { get; set; } = string.Empty;
    public float PurchasePrice { get; set; }
    // A fixed purchase date (logging an old haul); null means the day the movie is added
    public DateOnly? PurchasedAt { get; set; }
    public bool IsGift { get; set; }
    public bool HasWatched { get; set; }
    public float Rating { get; set; }
    public string Review { get; set; } = string.Empty;
    public string ProductPosterPath { get; set; } = string.Empty;
    public bool IsStreaming { get; set; }
    public string ShelfSection { get; set; } = string.Empty;
    public int ShelfNumber { get; set; }
    public int HDDriveNumber { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
