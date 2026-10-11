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
}
