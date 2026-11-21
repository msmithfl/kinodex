using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using Kinodex.Api.Services;
using System.Globalization;
using System.Security.Claims;
using System.Text;

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

        // GET export movies as CSV, one row per copy (the movie's own columns repeated on each; a
        // movie with no copies is one row with the copy columns blank). Titles are written library
        // style ("Thing, The") and in that order, so a leading A, An or The doesn't decide where a
        // movie files (LibraryTitle)
        group.MapGet("/export/csv", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var movies = (await db.Movies
                .Include(m => m.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id))
                .Where(m => m.UserId == userId)
                .ToListAsync())
                .Select(m => (Movie: m, Title: LibraryTitle.ToLibrary(m.Title)))
                .OrderBy(m => m.Title, StringComparer.InvariantCultureIgnoreCase)
                .ThenBy(m => m.Movie.Year)
                .ToList();

            var csv = new StringBuilder();
            csv.AppendLine(CsvHeader);

            foreach (var (movie, libraryTitle) in movies)
            {
                var genres = string.Join("|", movie.Genres);
                var collections = string.Join("|", movie.Collections);
                var title = libraryTitle.Replace("\"", "\"\"");
                foreach (var copy in movie.Copies.Count > 0 ? movie.Copies.Cast<Copy?>() : [null])
                {
                    var formats = copy is null ? "" : string.Join("|", copy.Formats);
                    // Invariant, so a price is always 4.99 (never 4,99), whatever the server's culture
                    csv.AppendLine(string.Create(CultureInfo.InvariantCulture,
                        $"\"{title}\",{copy?.UpcNumber},{movie.Year},\"{formats}\",\"{genres}\",\"{collections}\",\"{copy?.Condition}\",{copy?.Price},{movie.Rating},{movie.HasWatched},{movie.IsStreaming},{copy?.ShelfNumber},\"{copy?.ShelfSection}\",{copy?.HDDriveNumber},{movie.TmdbId},\"{movie.PosterPath}\",\"{movie.BackdropPath}\",\"{copy?.ProductPosterPath}\",{copy?.CreatedAt ?? movie.CreatedAt:yyyy-MM-dd},{copy?.PurchasedAt:yyyy-MM-dd},{copy?.IsGift}"));
                }
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return Results.File(bytes, "text/csv", "kinodex-export.csv");
        }).RequireAuthorization();

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
                var fields = ParseCsvLine(lines[i]);
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
                    var fields = ParseCsvLine(lines[i]);
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

            // A row whose UPC is already one of the user's copies is skipped, so importing an export
            // again doesn't double it (rows in the file sharing a UPC are each imported: a store
            // can have several copies of one release)
            var existingUpcs = await db.Movies
                .Where(m => m.UserId == userId)
                .SelectMany(m => m.Copies)
                .Where(c => c.UpcNumber != "")
                .Select(c => c.UpcNumber)
                .ToHashSetAsync();

            // Rows for a film already in the library, or earlier in the file, become copies of it
            var films = new Dictionary<string, Movie>();
            foreach (var existing in await db.Movies.Include(m => m.Copies).Where(m => m.UserId == userId).ToListAsync())
                films.TryAdd(FilmKey(existing.TmdbId, existing.Title, existing.Year), existing);
            var addedFilms = new HashSet<Movie>();

            var imported = 0;
            var skipped = 0;
            var errors = new List<string>();

            for (int i = 1; i < lines.Count; i++)
            {
                try
                {
                    var fields = ParseCsvLine(lines[i]);
                    if (fields.Length < 19) continue;

                    var upc = fields[1];
                    if (!string.IsNullOrEmpty(upc) && existingUpcs.Contains(upc))
                    {
                        skipped++;
                        continue;
                    }

                    var createdAt = DateTime.TryParse(fields[18], out var dt) ? dt.ToUniversalTime() : DateTime.UtcNow;
                    // Exports write "Thing, The"; back to "The Thing"
                    var title = LibraryTitle.FromLibrary(fields[0]);
                    var year = int.TryParse(fields[2], out var yr) ? yr : 0;
                    int? tmdbId = int.TryParse(fields[14], out var tmdb) ? tmdb : null;

                    var key = FilmKey(tmdbId, title, year);
                    if (!films.TryGetValue(key, out var movie))
                    {
                        movie = new Movie
                        {
                            UserId = userId,
                            Title = title,
                            Year = year,
                            Genres = fields[4].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                            Collections = fields[5].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
                            Rating = float.TryParse(fields[8], NumberStyles.Float, CultureInfo.InvariantCulture, out var rt) ? rt : 0,
                            HasWatched = bool.TryParse(fields[9], out var hw) && hw,
                            IsStreaming = bool.TryParse(fields[10], out var ip) && ip,
                            TmdbId = tmdbId,
                            PosterPath = fields[15],
                            BackdropPath = fields[16],
                            CreatedAt = createdAt,
                        };
                        films[key] = movie;
                        addedFilms.Add(movie);
                        db.Movies.Add(movie);
                    }
                    else if (addedFilms.Contains(movie) && createdAt < movie.CreatedAt)
                    {
                        movie.CreatedAt = createdAt; // A film added in this file dates from its first copy
                    }

                    if (ReadCsvCopy(fields, createdAt) is { } copy) movie.Copies.Add(copy);
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

    private const string CsvHeader = "Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,Streaming,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added,Purchase Date,Gift";

    // Which film a CSV row is: its TMDB id when it has one, otherwise its title and year
    private static string FilmKey(int? tmdbId, string title, int year) =>
        tmdbId is { } id ? $"tmdb:{id}" : $"title:{title.Trim().ToLowerInvariant()}|{year}";

    // The copy a CSV row describes, or null for a row with every copy column blank (how a movie with
    // no copies is exported). Rows from before copies always have one: their numbers are never blank.
    private static Copy? ReadCsvCopy(string[] fields, DateTime createdAt)
    {
        string Field(int index) => index < fields.Length ? fields[index] : "";
        int[] copyColumns = [1, 3, 6, 7, 11, 12, 13, 17, 19, 20];
        if (copyColumns.All(index => Field(index).Length == 0)) return null;

        return new Copy
        {
            UpcNumber = fields[1],
            Formats = fields[3].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList(),
            Condition = fields[6],
            Price = decimal.TryParse(fields[7], NumberStyles.Float, CultureInfo.InvariantCulture, out var price)
                ? Math.Round(price, 2)
                : 0,
            ShelfNumber = int.TryParse(fields[11], out var sn) ? sn : 0,
            ShelfSection = fields[12],
            HDDriveNumber = int.TryParse(fields[13], out var hd) ? hd : 0,
            ProductPosterPath = fields[17],
            CreatedAt = createdAt,
            // Exports from before the purchase date existed don't have the column; use the day the
            // movie was added, as existing movies got
            PurchasedAt = DateOnly.TryParseExact(Field(19), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var pd)
                ? pd
                : DateOnly.FromDateTime(createdAt),
            // Older exports have no Gift column
            IsGift = bool.TryParse(Field(20), out var gift) && gift,
        };
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
