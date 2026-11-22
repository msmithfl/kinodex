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

        // GET all TV shows, each with its copies
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.TvShows
                .Include(t => t.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id))
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        });

        // GET TV show by id
        group.MapGet("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var show = await db.TvShows
                .Include(t => t.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id))
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            return show is not null ? Results.Ok(show) : Results.NotFound();
        });

        // POST create TV show with its copies
        group.MapPost("/", async (TvShow show, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var error = Validate(show);
            if (error is not null) return Results.BadRequest(new { error });

            show.Id = 0;
            show.UserId = userId;
            show.JellyfinItemId = null; // Linked only by Update Streaming
            show.NotDuplicate = false; // Marked only in Settings → Duplicates
            show.CreatedAt = DateTime.UtcNow;
            show.Copies = CopyList.ForNewTitle(show.Copies, isShow: true);

            db.TvShows.Add(show);
            await db.SaveChangesAsync();
            CopyList.Sort(show);
            return Results.Created($"/api/tvshows/{show.Id}", show);
        });

        // PUT update TV show; the request's copies are what it has afterwards (CopyList)
        group.MapPut("/{id}", async (int id, TvShow updatedShow, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var show = await db.TvShows
                .Include(t => t.Copies)
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
            show.Collections = updatedShow.Collections;
            show.PosterPath = updatedShow.PosterPath;
            show.BackdropPath = updatedShow.BackdropPath;
            show.TmdbId = updatedShow.TmdbId;
            show.TotalSeasons = updatedShow.TotalSeasons;
            show.IsStreaming = updatedShow.IsStreaming;
            CopyList.Update(show, updatedShow.Copies, isShow: true);

            await db.SaveChangesAsync();
            CopyList.Sort(show);
            return Results.Ok(show);
        });

        // DELETE TV show (its copies are removed with it)
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

    // Returns a message naming the show and copy when the request can't be saved
    private static string? Validate(TvShow show)
    {
        if (string.IsNullOrWhiteSpace(show.Title)) return "Title is required.";
        if (show.TotalSeasons < 0) return $"{show.Title}: total seasons can't be negative.";
        return CopyList.Validate(show.Title, show.Copies, show.TotalSeasons);
    }
}
