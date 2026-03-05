using System.ComponentModel.DataAnnotations;

namespace MovieVault.Api.Models;

public class Product
{
    [Key]
    public required string Upc { get; set; }
    public decimal? EbayAveragePrice { get; set; }
    public int EbayPriceCount { get; set; }
    public DateTimeOffset? EbayCachedAt { get; set; }
}