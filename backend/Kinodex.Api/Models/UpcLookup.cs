using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Models;

// A saved UPCitemdb result for one barcode, shared by every user, so each UPC is only looked up
// once against the daily limit
[Index(nameof(Upc), IsUnique = true)]
public class UpcLookup
{
    public int Id { get; set; }
    public required string Upc { get; set; }
    // False when UPCitemdb had nothing for this UPC; such misses are retried after a while
    public bool Found { get; set; }
    public string Title { get; set; } = string.Empty;
    // Candidate product images, already filtered (https first, known-broken hosts removed)
    public List<string> Images { get; set; } = new List<string>();
    public DateTime LookedUpAt { get; set; } = DateTime.UtcNow;
}
