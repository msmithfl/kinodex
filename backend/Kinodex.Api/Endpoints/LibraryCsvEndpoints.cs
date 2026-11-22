using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using Kinodex.Api.Services;
using System.Globalization;
using System.Security.Claims;
using System.Text;

namespace Kinodex.Api.Endpoints;

// The whole library (movies and TV shows) as one CSV file, and importing it back. One row per copy,
// the title's own columns repeated on each; a title with no copies is one row with the copy columns
// blank. Kind says whether a row is a movie or a show; files from before it (movies only) have
// no Kind column, and still import.
public static class LibraryCsvEndpoints
{
    public static void MapLibraryCsvEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/titles").RequireAuthorization();

        // GET the library as CSV: movies, then shows. Titles are written library style ("Thing,
        // The") and in that order, so a leading A, An or The doesn't decide where one files
        // (LibraryTitle)
        group.MapGet("/export/csv", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var titles = (await db.Titles
                .Include(t => t.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id))
                .Where(t => t.UserId == userId)
                .ToListAsync())
                .Select(t => (Title: t, Library: LibraryTitle.ToLibrary(t.Title)))
                .OrderBy(t => t.Title is TvShow)
                .ThenBy(t => t.Library, StringComparer.InvariantCultureIgnoreCase)
                .ThenBy(t => t.Title.Year)
                .ToList();

            var csv = new StringBuilder();
            csv.AppendLine(Header);

            foreach (var (title, libraryTitle) in titles)
            {
                var show = title as TvShow;
                var kind = show is null ? TitleKinds.Movie : TitleKinds.Show;
                var genres = string.Join("|", title.Genres);
                var collections = string.Join("|", title.Collections);
                var name = libraryTitle.Replace("\"", "\"\"");
                foreach (var copy in title.Copies.Count > 0 ? title.Copies.Cast<Copy?>() : [null])
                {
                    var formats = copy is null ? "" : string.Join("|", copy.Formats);
                    var seasons = copy is null ? "" : string.Join("|", copy.Seasons);
                    // Invariant, so a price is always 4.99 (never 4,99), whatever the server's culture
                    csv.AppendLine(string.Create(CultureInfo.InvariantCulture,
                        $"\"{name}\",{copy?.UpcNumber},{title.Year},\"{formats}\",\"{genres}\",\"{collections}\",\"{copy?.Condition}\",{copy?.Price},{title.Rating},{title.HasWatched},{title.IsStreaming},{copy?.ShelfNumber},\"{copy?.ShelfSection}\",{copy?.HDDriveNumber},{title.TmdbId},\"{title.PosterPath}\",\"{title.BackdropPath}\",\"{copy?.ProductPosterPath}\",{copy?.CreatedAt ?? title.CreatedAt:yyyy-MM-dd},{copy?.PurchasedAt:yyyy-MM-dd},{copy?.IsGift},{kind},{show?.TotalSeasons},\"{seasons}\""));
                }
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return Results.File(bytes, "text/csv", "kinodex-export.csv");
        });

        // POST import a Kinodex CSV (this export, or an older movies-only one)
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

            var library = await db.Titles.Include(t => t.Copies).Where(t => t.UserId == userId).ToListAsync();

            // Rows for a title already in the library, or earlier in the file, become copies of it
            var titles = new Dictionary<string, CatalogTitle>();
            foreach (var existing in library) titles.TryAdd(TitleKey(existing), existing);
            var addedTitles = new HashSet<CatalogTitle>();

            // A row whose UPC is already on a copy of the same title is skipped, so importing an
            // export again doesn't double it. Other titles with the UPC don't count (a box set's
            // films share it), and rows in the file sharing one are each imported (a store can have
            // several copies of one release).
            var existingUpcs = library
                .SelectMany(t => t.Copies.Where(c => c.UpcNumber != "").Select(c => (TitleKey(t), c.UpcNumber)))
                .ToHashSet();

            var imported = 0;
            var skipped = 0;
            var errors = new List<string>();

            for (int i = 1; i < lines.Count; i++)
            {
                try
                {
                    var fields = ParseLine(lines[i]);
                    if (fields.Length < 19) continue;

                    var kind = Field(fields, 21).Trim().ToLowerInvariant() switch
                    {
                        "" or TitleKinds.Movie => TitleKinds.Movie,
                        TitleKinds.Show => TitleKinds.Show,
                        var other => throw new FormatException($"Kind \"{other}\" isn't movie or show."),
                    };
                    var isShow = kind == TitleKinds.Show;

                    var createdAt = DateTime.TryParse(fields[18], out var dt) ? dt.ToUniversalTime() : DateTime.UtcNow;
                    // Exports write "Thing, The"; back to "The Thing"
                    var name = LibraryTitle.FromLibrary(fields[0]);
                    var year = int.TryParse(fields[2], out var yr) ? yr : 0;
                    int? tmdbId = int.TryParse(fields[14], out var tmdb) ? tmdb : null;
                    var key = TitleKey(kind, tmdbId, name, year);

                    var upc = fields[1];
                    if (!string.IsNullOrEmpty(upc) && existingUpcs.Contains((key, upc)))
                    {
                        skipped++;
                        continue;
                    }

                    titles.TryGetValue(key, out var title);
                    int? totalSeasons = isShow
                        ? (title as TvShow)?.TotalSeasons ?? (int.TryParse(Field(fields, 22), out var ts) ? ts : 0)
                        : null;

                    var copy = ReadCopy(fields, createdAt, isShow);
                    if (copy is not null && CopyList.Validate(name, [copy], totalSeasons) is { } error)
                    {
                        errors.Add($"Row {i + 1}: {error}");
                        continue;
                    }

                    if (title is null)
                    {
                        title = isShow
                            ? new TvShow { Title = name, TotalSeasons = totalSeasons ?? 0 }
                            : new Movie { Title = name };
                        title.UserId = userId;
                        title.Year = year;
                        title.Genres = fields[4].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList();
                        title.Collections = fields[5].Split('|', StringSplitOptions.RemoveEmptyEntries).ToList();
                        title.Rating = float.TryParse(fields[8], NumberStyles.Float, CultureInfo.InvariantCulture, out var rt) ? rt : 0;
                        title.HasWatched = bool.TryParse(fields[9], out var hw) && hw;
                        title.IsStreaming = bool.TryParse(fields[10], out var st) && st;
                        title.TmdbId = tmdbId;
                        title.PosterPath = fields[15];
                        title.BackdropPath = fields[16];
                        title.CreatedAt = createdAt;
                        titles[key] = title;
                        addedTitles.Add(title);
                        db.Titles.Add(title);
                    }
                    else if (addedTitles.Contains(title) && createdAt < title.CreatedAt)
                    {
                        title.CreatedAt = createdAt; // A title added in this file dates from its first copy
                    }

                    if (copy is not null) title.Copies.Add(copy);
                    imported++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Row {i + 1}: {ex.Message}");
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { imported, skipped, errors });
        });
    }

    private const string Header = "Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,Streaming,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added,Purchase Date,Gift,Kind,Total Seasons,Seasons";

    // A column older files don't have yet reads as blank
    private static string Field(string[] fields, int index) => index < fields.Length ? fields[index] : "";

    // Which title a CSV row is: its kind (TMDB numbers movies and shows separately) and TMDB id
    // when it has one, otherwise its kind, title and year
    private static string TitleKey(string kind, int? tmdbId, string title, int year) =>
        tmdbId is { } id ? $"{kind}:tmdb:{id}" : $"{kind}:title:{title.Trim().ToLowerInvariant()}|{year}";

    private static string TitleKey(CatalogTitle title) =>
        TitleKey(title is TvShow ? TitleKinds.Show : TitleKinds.Movie, title.TmdbId, title.Title, title.Year);

    // The copy a CSV row describes, or null for a row with every copy column blank (how a title with
    // no copies is exported). Rows from before copies always have one: their numbers are never blank.
    private static Copy? ReadCopy(string[] fields, DateTime createdAt, bool isShow)
    {
        int[] copyColumns = [1, 3, 6, 7, 11, 12, 13, 17, 19, 20, 23];
        if (copyColumns.All(index => Field(fields, index).Length == 0)) return null;

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
            // title was added, as existing movies got
            PurchasedAt = DateOnly.TryParseExact(Field(fields, 19), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var pd)
                ? pd
                : DateOnly.FromDateTime(createdAt),
            // Older exports have no Gift column
            IsGift = bool.TryParse(Field(fields, 20), out var gift) && gift,
            // A show's copy covers some of its seasons ("1|2|3"); a movie's has none
            Seasons = isShow
                ? Field(fields, 23).Split('|', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => int.Parse(s, CultureInfo.InvariantCulture)).Distinct().Order().ToList()
                : [],
        };
    }

    // One CSV line's fields; quoted fields may hold commas and doubled quotes. Also reads Letterboxd
    // exports.
    public static string[] ParseLine(string line)
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
