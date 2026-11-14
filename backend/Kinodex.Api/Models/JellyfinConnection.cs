using System.ComponentModel.DataAnnotations;

namespace Kinodex.Api.Models;

// A user's Jellyfin server (docs/design/jellyfin-compare.md): one per user, saved once the address
// and key have been checked against the server. The API key is stored encrypted (Data Protection)
// and never sent back to the browser.
public class JellyfinConnection
{
    [Key]
    public string UserId { get; set; } = string.Empty; // Clerk user ID
    public string ServerUrl { get; set; } = string.Empty; // e.g. https://jellyfin.example.com
    public string ProtectedApiKey { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty; // As Jellyfin reports it
    public string ServerVersion { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
}
