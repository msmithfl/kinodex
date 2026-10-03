using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class TvShowEndpoints
{
    public static void MapTvShowEndpoints(this IEndpointRouteBuilder app)
    {
        // Every route is scoped to the signed-in user; the client never chooses the UserId
        var group = app.MapGroup("/api/tvshows").RequireAuthorization();

        // GET all TV shows
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.TvShows
                .Include(t => t.Purchases.OrderBy(p => p.PurchasedAt).ThenBy(p => p.Id))
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        });

        // GET TV show by id
        group.MapGet("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var show = await db.TvShows
                .Include(t => t.Purchases.OrderBy(p => p.PurchasedAt).ThenBy(p => p.Id))
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            return show is not null ? Results.Ok(show) : Results.NotFound();
        });

        // POST create TV show with its purchases
        group.MapPost("/", async (TvShow show, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var error = Validate(show);
            if (error is not null) return Results.BadRequest(new { error });

            show.Id = 0;
            show.UserId = userId;
            show.CreatedAt = DateTime.UtcNow;
            show.Purchases = PreparePurchases(show.Purchases);

            db.TvShows.Add(show);
            await db.SaveChangesAsync();
            return Results.Created($"/api/tvshows/{show.Id}", show);
        });

        // PUT update TV show; the request's purchase list replaces the stored one
        group.MapPut("/{id}", async (int id, TvShow updatedShow, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var show = await db.TvShows
                .Include(t => t.Purchases)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (show is null) return Results.NotFound();

            var error = Validate(updatedShow);
            if (error is not null) return Results.BadRequest(new { error });

            show.Title = updatedShow.Title;
            show.HasWatched = updatedShow.HasWatched;
            show.Rating = updatedShow.Rating;
            show.Review = updatedShow.Review;
            show.Year = updatedShow.Year;
            show.Genres = updatedShow.Genres;
            show.PosterPath = updatedShow.PosterPath;
            show.BackdropPath = updatedShow.BackdropPath;
            show.ProductPosterPath = updatedShow.ProductPosterPath;
            show.TmdbId = updatedShow.TmdbId;
            show.TotalSeasons = updatedShow.TotalSeasons;
            show.IsOnPlex = updatedShow.IsOnPlex;

            db.TvShowPurchases.RemoveRange(show.Purchases);
            show.Purchases = PreparePurchases(updatedShow.Purchases);

            await db.SaveChangesAsync();
            show.Purchases = show.Purchases.OrderBy(p => p.PurchasedAt).ThenBy(p => p.Id).ToList();
            return Results.Ok(show);
        });

        // DELETE TV show (its purchases are removed with it)
        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var show = await db.TvShows.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (show is null) return Results.NotFound();

            db.TvShows.Remove(show);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    // Returns a message naming the show and purchase when the request can't be saved
    private static string? Validate(TvShow show)
    {
        if (string.IsNullOrWhiteSpace(show.Title)) return "Title is required.";
        if (show.TotalSeasons < 0) return $"{show.Title}: total seasons can't be negative.";

        for (var i = 0; i < show.Purchases.Count; i++)
        {
            var purchase = show.Purchases[i];
            var label = $"{show.Title}, purchase {i + 1}";

            if (purchase.Seasons.Count == 0) return $"{label} doesn't cover any seasons.";
            if (purchase.Seasons.Any(s => s < 1)) return $"{label} has a season number below 1.";
            if (show.TotalSeasons > 0 && purchase.Seasons.Any(s => s > show.TotalSeasons))
                return $"{label} includes a season past season {show.TotalSeasons}, the last season.";
            if (purchase.Price < 0) return $"{label} has a negative price.";
        }

        return null;
    }

    // New rows every time: ids from the client are ignored and seasons are tidied
    private static List<TvShowPurchase> PreparePurchases(List<TvShowPurchase> purchases) =>
        purchases.Select(p => new TvShowPurchase
        {
            Seasons = p.Seasons.Distinct().Order().ToList(),
            Price = p.Price,
            UpcNumber = p.UpcNumber,
            Formats = p.Formats,
            Condition = p.Condition,
            PurchasedAt = p.PurchasedAt == default
                ? DateOnly.FromDateTime(DateTime.UtcNow)
                : p.PurchasedAt,
        }).ToList();
}
