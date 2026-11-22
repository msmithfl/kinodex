using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using Kinodex.Api.Services;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class MovieEndpoints
{
    public static void MapMovieEndpoints(this IEndpointRouteBuilder app)
    {
        // Every route needs a signed-in user and only touches that user's movies
        var group = app.MapGroup("/api/movies").RequireAuthorization();

        // GET all movies, each with its copies
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.Movies
                .Include(m => m.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id))
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }).RequireAuthorization();

        // GET movie by id (only the signed-in user's own movies)
        group.MapGet("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.Movies
                .Include(m => m.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id))
                .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId) is Movie movie
                ? Results.Ok(movie)
                : Results.NotFound();
        });

        // POST create movie with its copies, owned by the signed-in user whatever the request says
        group.MapPost("/", async (Movie movie, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var error = CopyList.Validate(movie.Title, movie.Copies, totalSeasons: null);
            if (error is not null) return Results.BadRequest(new { error });

            try
            {
                movie.Id = 0;
                movie.UserId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
                movie.JellyfinItemId = null; // Linked only by Update Streaming
                movie.NotDuplicate = false; // Marked only in Settings → Duplicates
                movie.Copies = CopyList.ForNewTitle(movie.Copies, isShow: false);
                db.Movies.Add(movie);
                await db.SaveChangesAsync();
                CopyList.Sort(movie);
                Console.WriteLine($"Created movie ID={movie.Id}, Title={movie.Title}, UserId={movie.UserId}");
                return Results.Created($"/api/movies/{movie.Id}", movie);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR creating movie: {ex.Message}\n{ex.StackTrace}");
                return Results.Problem($"Failed to save movie: {ex.Message}", statusCode: 500);
            }
        });

        // PUT update movie; the request's copies are what it has afterwards (CopyList)
        // The owner never changes, and only the owner can edit
        group.MapPut("/{id}", async (int id, Movie updatedMovie, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var movie = await db.Movies
                .Include(m => m.Copies)
                .FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
            if (movie is null) return Results.NotFound();

            var error = CopyList.Validate(updatedMovie.Title, updatedMovie.Copies, totalSeasons: null);
            if (error is not null) return Results.BadRequest(new { error });

            movie.Title = updatedMovie.Title;
            movie.Collections = updatedMovie.Collections;
            movie.HasWatched = updatedMovie.HasWatched;
            movie.Rating = updatedMovie.Rating;
            movie.Review = updatedMovie.Review;
            movie.Year = updatedMovie.Year;
            movie.Genres = updatedMovie.Genres;
            movie.PosterPath = updatedMovie.PosterPath;
            movie.BackdropPath = updatedMovie.BackdropPath;
            movie.TmdbId = updatedMovie.TmdbId;
            movie.IsStreaming = updatedMovie.IsStreaming;
            CopyList.Update(movie, updatedMovie.Copies, isShow: false);

            await db.SaveChangesAsync();
            CopyList.Sort(movie);
            return Results.Ok(movie);
        });

        // DELETE movie
        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var movie = await db.Movies.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId);
            if (movie is null) return Results.NotFound();

            db.Movies.Remove(movie);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // POST import movies from Letterboxd CSV
        group.MapPost("/import/letterboxd", async (HttpContext context, ClaimsPrincipal user, MovieDbContext db, TmdbMatchingService tmdb) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            if (!context.Request.HasFormContentType || !context.Request.Form.Files.Any())
                return Results.BadRequest(new { error = "No file uploaded." });

            var file = context.Request.Form.Files[0];
            using var reader = new StreamReader(file.OpenReadStream());
            var content = await reader.ReadToEndAsync();
            var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                               .Select(l => l.TrimEnd('\r'))
                               .ToList();

            // Find the header row with "Position,Name,Year"
            int headerIndex = -1;
            for (int i = 0; i < lines.Count; i++)
            {
                var fields = LibraryCsvEndpoints.ParseLine(lines[i]);
                if (fields.Length >= 3 &&
                    fields[0].Trim().Equals("Position", StringComparison.OrdinalIgnoreCase) &&
                    fields[1].Trim().Equals("Name", StringComparison.OrdinalIgnoreCase) &&
                    fields[2].Trim().Equals("Year", StringComparison.OrdinalIgnoreCase))
                {
                    headerIndex = i;
                    break;
                }
            }

            if (headerIndex == -1)
                return Results.BadRequest(new { error = "Could not find film list header row. Is this a valid Letterboxd list export?" });

            // Deduplicate by title+year
            var existingTitleYears = await db.Movies
                .Where(m => m.UserId == userId)
                .Select(m => new { m.Title, m.Year })
                .ToListAsync();
            var existingSet = existingTitleYears
                .Select(m => $"{m.Title.ToLower()}|{m.Year}")
                .ToHashSet();

            var imported = 0;
            var skipped = 0;
            var errors = new List<string>();

            for (int i = headerIndex + 1; i < lines.Count; i++)
            {
                try
                {
                    var fields = LibraryCsvEndpoints.ParseLine(lines[i]);
                    if (fields.Length < 3) continue;

                    var title = fields[1].Trim();
                    var year = int.TryParse(fields[2].Trim(), out var yr) ? yr : 0;

                    if (string.IsNullOrEmpty(title)) continue;

                    if (existingSet.Contains($"{title.ToLower()}|{year}"))
                    {
                        skipped++;
                        continue;
                    }

                    // Try to enrich with TMDB data
                    var tmdbResults = await tmdb.SearchTmdb(title, year > 0 ? year : null);
                    var match = tmdbResults.FirstOrDefault();

                    var movie = new Movie
                    {
                        UserId = userId,
                        Title = title,
                        Year = match != null && match.Year.HasValue ? match.Year.Value : year,
                        TmdbId = match?.TmdbId,
                        PosterPath = match?.PosterPath ?? "",
                        BackdropPath = match?.BackdropPath ?? "",
                        Collections = new List<string>(),
                        Genres = match?.Genres ?? new List<string>(),
                        HasWatched = false,
                        Rating = 0,
                        Review = "",
                        IsStreaming = false,
                        CreatedAt = DateTime.UtcNow,
                        // One copy, with nothing known about it yet, as every movie had before copies
                        Copies =
                        [
                            new Copy
                            {
                                Condition = "Unknown",
                                PurchasedAt = DateOnly.FromDateTime(DateTime.UtcNow),
                            },
                        ],
                    };

                    db.Movies.Add(movie);
                    existingSet.Add($"{title.ToLower()}|{year}");
                    imported++;

                    // Save in batches of 20 to avoid long-running transactions
                    if (imported % 20 == 0)
                        await db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    errors.Add($"Row {i + 1}: {ex.Message}");
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { imported, skipped, errors });
        }).RequireAuthorization();
    }
}
