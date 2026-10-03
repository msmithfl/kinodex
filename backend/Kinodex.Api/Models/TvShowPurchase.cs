using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Models;

// One transaction: a complete set, a single season, or anything in between
public class TvShowPurchase
{
    public int Id { get; set; }
    public int TvShowId { get; set; }
    public List<int> Seasons { get; set; } = new List<int>(); // Season numbers this purchase covers
    [Precision(10, 2)]
    public decimal Price { get; set; }
    public string UpcNumber { get; set; } = string.Empty;
    public List<string> Formats { get; set; } = new List<string>();
    public string Condition { get; set; } = string.Empty;
    public DateOnly PurchasedAt { get; set; }
}
