using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class MoviePresetEndpoints
{
    public static void MapMoviePresetEndpoints(this IEndpointRouteBuilder app)
    {
        // The signed-in user's own Add Movie presets
        var group = app.MapGroup("/api/movie-presets").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.MoviePresets
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.Name)
                .ToListAsync();
        });

        group.MapPost("/", async (MoviePreset preset, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            preset.Name = preset.Name.Trim();
            if (preset.Name.Length == 0) return Results.BadRequest("A preset needs a name.");
            if (await NameTaken(db, userId, preset.Name, null))
                return Results.Conflict($"A preset named \"{preset.Name}\" already exists.");

            preset.Id = 0;
            preset.UserId = userId;
            preset.CreatedAt = DateTime.UtcNow;
            db.MoviePresets.Add(preset);
            await db.SaveChangesAsync();
            return Results.Created($"/api/movie-presets/{preset.Id}", preset);
        });

        // PUT replaces the preset's name and every value
        group.MapPut("/{id}", async (int id, MoviePreset updated, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var preset = await db.MoviePresets.FindAsync(id);
            if (preset is null || preset.UserId != userId) return Results.NotFound();

            var name = updated.Name.Trim();
            if (name.Length == 0) return Results.BadRequest("A preset needs a name.");
            if (await NameTaken(db, preset.UserId, name, id))
                return Results.Conflict($"A preset named \"{name}\" already exists.");

            preset.Name = name;
            preset.UpcNumber = updated.UpcNumber;
            preset.Collections = updated.Collections;
            preset.Formats = updated.Formats;
            preset.Condition = updated.Condition;
            preset.PurchasePrice = updated.PurchasePrice;
            preset.PurchasedAt = updated.PurchasedAt;
            preset.IsGift = updated.IsGift;
            preset.HasWatched = updated.HasWatched;
            preset.Rating = updated.Rating;
            preset.Review = updated.Review;
            preset.ProductPosterPath = updated.ProductPosterPath;
            preset.IsStreaming = updated.IsStreaming;
            preset.ShelfSection = updated.ShelfSection;
            preset.ShelfNumber = updated.ShelfNumber;
            preset.HDDriveNumber = updated.HDDriveNumber;

            await db.SaveChangesAsync();
            return Results.Ok(preset);
        });

        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var preset = await db.MoviePresets.FindAsync(id);
            if (preset is null || preset.UserId != userId) return Results.NotFound();

            db.MoviePresets.Remove(preset);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    // Names are unique per user, ignoring case
    private static Task<bool> NameTaken(MovieDbContext db, string userId, string name, int? exceptId) =>
        db.MoviePresets.AnyAsync(p =>
            p.UserId == userId && p.Name.ToLower() == name.ToLower() && p.Id != exceptId);
}
