using System.ComponentModel.DataAnnotations;

namespace Kinodex.Api.Models;

// One row per user, created the first time they save a setting. Until then the API returns
// these defaults. Each setting is its own typed column; adding one means adding a property
// (with its default) and a migration.
public class UserSettings
{
    [Key]
    public string UserId { get; set; } = string.Empty; // Clerk user ID

    // Show the completion ring on collection posters (Collections page)
    public bool ShowCollectionCompletion { get; set; } = true;

    // The year under the user's name on the dashboard ("Collecting since 2019"). Null until they
    // choose one; the dashboard shows the year they signed up instead.
    public int? CollectingSince { get; set; }

    // The earliest year that can be chosen; the latest is the current year
    public const int EarliestCollectingSince = 1950;
}
