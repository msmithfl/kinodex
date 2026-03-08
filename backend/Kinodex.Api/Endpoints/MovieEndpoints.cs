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
            csv.AppendLine("Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,On Plex,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Product Poster Path,Date Added");

            foreach (var movie in movies)
            {
                var formats = string.Join("|", movie.Formats);
                var genres = string.Join("|", movie.Genres);
                var collections = string.Join("|", movie.Collections);
                var title = movie.Title.Replace("\"", "\"\"");
                csv.AppendLine($"\"{title}\",{movie.UpcNumber},{movie.Year},\"{formats}\",\"{genres}\",\"{collections}\",\"{movie.Condition}\",{movie.PurchasePrice},{movie.Rating},{movie.HasWatched},{movie.IsOnPlex},{movie.ShelfNumber},\"{movie.ShelfSection}\",{movie.HDDriveNumber},{movie.TmdbId},\"{movie.PosterPath}\",\"{movie.ProductPosterPath}\",{movie.CreatedAt:yyyy-MM-dd}");
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

            // Map header names to column indices so column order doesn't matter
            var headers = ParseCsvLine(lines[0]);
            var col = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (int h = 0; h < headers.Length; h++)
                col[headers[h].Trim()] = h;

            int Idx(string name) => col.TryGetValue(name, out var i) ? i : -1;
            string Field(string[] f, string name) { var i = Idx(name); return i >= 0 && i < f.Length ? f[i] : ""; }

            for (int i = 1; i < lines.Count; i++)
            {
                try
                {
                    var fields = ParseCsvLine(lines[i]);
                    if (fields.Length < 2) continue;

                    var upc = Field(fields, "UPC");
                    if (!string.IsNullOrEmpty(upc) && existingUpcs.Contains(upc))
                    {
                        skipped++;
                        continue;
                    }

                    var movie = new Movie
                    {
                        UserId = userId,
                        Title = Field(fields, "Title"),
                        UpcNumber = upc,
                        Year = int.TryParse(Field(fields, "Year"), out var yr) ? yr : 0,
                        Formats = Field(fields, "Formats").Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        Genres = Field(fields, "Genres").Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        Collections = Field(fields, "Collections").Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        Condition = Field(fields, "Condition"),
                        PurchasePrice = float.TryParse(Field(fields, "Purchase Price"), NumberStyles.Float, CultureInfo.InvariantCulture, out var pp) ? pp : 0,
                        Rating = float.TryParse(Field(fields, "Rating"), NumberStyles.Float, CultureInfo.InvariantCulture, out var rt) ? rt : 0,
                        HasWatched = bool.TryParse(Field(fields, "Watched"), out var hw) && hw,
                        IsOnPlex = bool.TryParse(Field(fields, "On Plex"), out var ip) && ip,
                        ShelfNumber = int.TryParse(Field(fields, "Shelf Number"), out var sn) ? sn : 0,
                        ShelfSection = Field(fields, "Shelf Section"),
                        HDDriveNumber = int.TryParse(Field(fields, "HDD Number"), out var hd) ? hd : 0,
                        TmdbId = int.TryParse(Field(fields, "TMDB ID"), out var tmdb) ? tmdb : null,
                        PosterPath = Field(fields, "Poster Path"),
                        ProductPosterPath = Field(fields, "Product Poster Path"),
                        CreatedAt = DateTime.TryParse(Field(fields, "Date Added"), out var dt) ? dt.ToUniversalTime() : DateTime.UtcNow,
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
