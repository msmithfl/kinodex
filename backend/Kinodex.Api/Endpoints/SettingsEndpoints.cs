using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        // The signed-in user's own settings; the client never chooses whose
        var group = app.MapGroup("/api/settings").RequireAuthorization();

        // GET settings, or the defaults if the user hasn't saved any yet
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var settings = await db.UserSettings.FindAsync(userId)
                ?? new UserSettings { UserId = userId };
            return Results.Ok(settings);
        });

        // PUT settings: creates the user's row on first save, updates it after
        group.MapPut("/", async (UserSettings updated, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            // A year from the earliest allowed up to this one (or next, for anyone already into it
            // in a timezone ahead of UTC)
            if (updated.CollectingSince is int year
                && (year < UserSettings.EarliestCollectingSince || year > DateTime.UtcNow.Year + 1))
            {
                return Results.BadRequest(new
                {
                    error = $"Collecting since is a year from {UserSettings.EarliestCollectingSince} to this year.",
                });
            }

            var settings = await db.UserSettings.FindAsync(userId);
            if (settings is null)
            {
                settings = new UserSettings { UserId = userId };
                db.UserSettings.Add(settings);
            }

            settings.ShowCollectionCompletion = updated.ShowCollectionCompletion;
            settings.CollectingSince = updated.CollectingSince;

            await db.SaveChangesAsync();
            return Results.Ok(settings);
        });
    }
}
