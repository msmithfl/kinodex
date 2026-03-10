using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Globalization;
using System.Security.Claims;
using System.Text;

namespace Kinodex.Api.Endpoints;

public static class MovieEndpoints
{
    public static void MapMovieEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/movies");

        // GET all movies
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.Movies
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }).RequireAuthorization();

        // GET movie by id
        group.MapGet("/{id}", async (int id, MovieDbContext db) =>
        {
            return await db.Movies.FindAsync(id) is Movie movie
                ? Results.Ok(movie)
                : Results.NotFound();
        });

        // POST create movie
        group.MapPost("/", async (Movie movie, MovieDbContext db) =>
        {
            db.Movies.Add(movie);
            await db.SaveChangesAsync();
            return Results.Created($"/api/movies/{movie.Id}", movie);
        });

        // PUT update movie
        group.MapPut("/{id}", async (int id, Movie updatedMovie, MovieDbContext db) =>
        {
            var movie = await db.Movies.FindAsync(id);
            if (movie is null) return Results.NotFound();

            movie.UserId = updatedMovie.UserId;
            movie.Title = updatedMovie.Title;
            movie.UpcNumber = updatedMovie.UpcNumber;
            movie.Formats = updatedMovie.Formats;
            movie.Collections = updatedMovie.Collections;
            movie.Condition = updatedMovie.Condition;
            movie.PurchasePrice = updatedMovie.PurchasePrice;
            movie.HasWatched = updatedMovie.HasWatched;
            movie.Rating = updatedMovie.Rating;
            movie.Review = updatedMovie.Review;
            movie.Year = updatedMovie.Year;
            movie.Genres = updatedMovie.Genres;
            movie.PosterPath = updatedMovie.PosterPath;
            movie.BackdropPath = updatedMovie.BackdropPath;
            movie.ProductPosterPath = updatedMovie.ProductPosterPath;
            movie.TmdbId = updatedMovie.TmdbId;
            movie.HDDriveNumber = updatedMovie.HDDriveNumber;
            movie.ShelfNumber = updatedMovie.ShelfNumber;
            movie.ShelfSection = updatedMovie.ShelfSection;
            movie.IsOnPlex = updatedMovie.IsOnPlex;

            await db.SaveChangesAsync();
            return Results.Ok(movie);
        });

        // DELETE movie
        group.MapDelete("/{id}", async (int id, MovieDbContext db) =>
        {
            var movie = await db.Movies.FindAsync(id);
            if (movie is null) return Results.NotFound();

            db.Movies.Remove(movie);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // GET export movies as CSV
        group.MapGet("/export/csv", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var movies = await db.Movies
                .Where(m => m.UserId == userId)
                .OrderBy(m => m.Title)
                .ToListAsync();

            var csv = new StringBuilder();
            csv.AppendLine("Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,On Plex,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added");

            foreach (var movie in movies)
            {
                var formats = string.Join("|", movie.Formats);
                var genres = string.Join("|", movie.Genres);
                var collections = string.Join("|", movie.Collections);
                var title = movie.Title.Replace("\"", "\"\"");
                csv.AppendLine($"\"{title}\",{movie.UpcNumber},{movie.Year},\"{formats}\",\"{genres}\",\"{collections}\",\"{movie.Condition}\",{movie.PurchasePrice},{movie.Rating},{movie.HasWatched},{movie.IsOnPlex},{movie.ShelfNumber},\"{movie.ShelfSection}\",{movie.HDDriveNumber},{movie.TmdbId},\"{movie.PosterPath}\",\"{movie.BackdropPath}\",\"{movie.ProductPosterPath}\",{movie.CreatedAt:yyyy-MM-dd}");
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return Results.File(bytes, "text/csv", "movie-vault-export.csv");
        }).RequireAuthorization();

        // POST import movies from CSV
        group.MapPost("/import/csv", async (HttpContext context, ClaimsPrincipal user, MovieDbContext db) =>
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

            if (lines.Count < 2)
                return Results.BadRequest(new { error = "CSV file is empty or has no data rows." });

            var existingUpcs = await db.Movies
                .Where(m => m.UserId == userId && m.UpcNumber != null && m.UpcNumber != "")
                .Select(m => m.UpcNumber)
                .ToHashSetAsync();

            var imported = 0;
            var skipped = 0;
            var errors = new List<string>();

            for (int i = 1; i < lines.Count; i++)
            {
                try
                {
                    var fields = ParseCsvLine(lines[i]);
                    if (fields.Length < 20) continue;

                    var upc = fields[1];
                    if (!string.IsNullOrEmpty(upc) && existingUpcs.Contains(upc))
                    {
                        skipped++;
                        continue;
                    }

                    var movie = new Movie
                    {
                        UserId = userId,
                        Title = fields[0],
                        UpcNumber = fields[1],
                        Year = int.TryParse(fields[2], out var yr) ? yr : 0,
                        Formats = fields[3].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        Genres = fields[4].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        Collections = fields[5].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        Condition = fields[6],
                        PurchasePrice = float.TryParse(fields[7], NumberStyles.Float, CultureInfo.InvariantCulture, out var pp) ? pp : 0,
                        Rating = float.TryParse(fields[8], NumberStyles.Float, CultureInfo.InvariantCulture, out var rt) ? rt : 0,
                        HasWatched = bool.TryParse(fields[9], out var hw) && hw,
                        IsOnPlex = bool.TryParse(fields[10], out var ip) && ip,
                        ShelfNumber = int.TryParse(fields[11], out var sn) ? sn : 0,
                        ShelfSection = fields[12],
                        HDDriveNumber = int.TryParse(fields[13], out var hd) ? hd : 0,
                        TmdbId = int.TryParse(fields[14], out var tmdb) ? tmdb : null,
                        PosterPath = fields[15],
                        BackdropPath = fields[16],
                        ProductPosterPath = fields[17],
                        CreatedAt = DateTime.TryParse(fields[18], out var dt) ? dt.ToUniversalTime() : DateTime.UtcNow,
                    };

                    db.Movies.Add(movie);
                    imported++;
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

    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        int i = 0;
        while (i < line.Length)
        {
            if (line[i] == '"')
            {
                i++;
                var sb = new StringBuilder();
                while (i < line.Length)
                {
                    if (line[i] == '"' && i + 1 < line.Length && line[i + 1] == '"')
                    { sb.Append('"'); i += 2; }
                    else if (line[i] == '"') { i++; break; }
                    else sb.Append(line[i++]);
                }
                fields.Add(sb.ToString());
                if (i < line.Length && line[i] == ',') i++;
            }
            else
            {
                int start = i;
                while (i < line.Length && line[i] != ',') i++;
                fields.Add(line[start..i]);
                if (i < line.Length) i++;
            }
        }
        return fields.ToArray();
    }
}
