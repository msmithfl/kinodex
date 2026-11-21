using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Models;

// One physical item of a title: a disc, a tape, a set (docs/design/titles-and-copies.md). A box set
// of several films is a copy of each, with the set's UPC and image. A copy keeps its id when its
// title is saved, so things can point at it (lending, later).
public class Copy
{
    public int Id { get; set; }
    public int TitleId { get; set; }
    // The seasons a TV show's copy covers (a complete set, one season, anything in between). The
    // same season can be in more than one copy (a DVD later upgraded to Blu-ray). Empty for a movie.
    public List<int> Seasons { get; set; } = new List<int>();
    public string UpcNumber { get; set; } = string.Empty;
    public List<string> Formats { get; set; } = new List<string>();
    public string Condition { get; set; } = string.Empty;
    [Precision(10, 2)]
    public decimal Price { get; set; }
    // The day it was bought, which spending is counted by; it can be earlier than CreatedAt
    // (logging something bought before it was added). Today when not given.
    public DateOnly PurchasedAt { get; set; }
    public bool IsGift { get; set; } = false; // Received as a gift rather than bought
    public string ProductPosterPath { get; set; } = string.Empty; // This copy's box art (found by its UPC)
    public string ShelfSection { get; set; } = string.Empty; // A section name (ShelfSection.Name)
    public int ShelfNumber { get; set; }
    public int HDDriveNumber { get; set; } // The drive its rip is on, 0 for none
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // "Date added"
}
