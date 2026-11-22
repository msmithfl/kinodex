using System.Security.Claims;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Endpoints;

// Movies and TV shows together (one Titles table): merging duplicates
// (docs/design/titles-and-copies.md)
public static class TitleEndpoints
{
    // One merge: the title kept, and the ones folded into it
    public record MergeGroup(int KeepId, List<int> MergeIds);
    public record MergeRequest(List<MergeGroup> Groups);
    // How many titles were folded into others (and removed)
    public record MergeResult(int Merged);
    // Entries to mark (or unmark) "Not a duplicate"
    public record NotDuplicateRequest(List<int> Ids, bool NotDuplicate);

    public static void MapTitleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/titles").RequireAuthorization();

        // POST merge duplicates: each group's titles become its kept title, with every copy (each
        // keeping its id) and their details combined (TitleMerge); the others are removed. All
        // groups or none: one transaction.
        group.MapPost("/merge", async (MergeRequest request, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

            if (request.Groups is null || request.Groups.Any(g => g.MergeIds is not { Count: > 0 } || g.MergeIds.Contains(g.KeepId)))
                return Results.BadRequest(new { error = "Each merge needs a title to keep and others to fold into it." });
            var ids = request.Groups.SelectMany(g => g.MergeIds.Append(g.KeepId)).ToList();
            if (ids.Count != ids.Distinct().Count())
                return Results.BadRequest(new { error = "A title can only be in one merge." });

            var titles = await db.Titles
                .Where(t => t.UserId == userId && ids.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id);
            if (titles.Count != ids.Count) return Results.NotFound(); // Missing, or someone else's

            if (request.Groups.Any(g => g.MergeIds.Any(id => titles[id].GetType() != titles[g.KeepId].GetType())))
                return Results.BadRequest(new { error = "A movie and a TV show can't be merged." });

            await using var transaction = await db.Database.BeginTransactionAsync();
            foreach (var merge in request.Groups)
            {
                var keep = titles[merge.KeepId];
                var others = merge.MergeIds.Select(id => titles[id]).OrderBy(t => t.CreatedAt).ThenBy(t => t.Id).ToList();

                // The copies move over as they are (same ids), so nothing pointing at one is lost
                await db.Copies
                    .Where(c => merge.MergeIds.Contains(c.TitleId))
                    .ExecuteUpdateAsync(s => s.SetProperty(c => c.TitleId, merge.KeepId));

                TitleMerge.Combine(keep, others);
                db.Titles.RemoveRange(others);
            }
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Ok(new MergeResult(request.Groups.Sum(g => g.MergeIds.Count)));
        }).Produces<MergeResult>();

        // PUT mark entries "Not a duplicate" (separate on purpose, though they share a TMDB id), or
        // unmark them so Settings → Duplicates lists them again. Only the user's own titles.
        group.MapPut("/not-duplicate", async (NotDuplicateRequest request, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (request.Ids is not { Count: > 0 })
                return Results.BadRequest(new { error = "Choose the entries to mark." });

            var ids = request.Ids.Distinct().ToList();
            var titles = db.Titles.Where(t => t.UserId == userId && ids.Contains(t.Id));
            if (await titles.CountAsync() != ids.Count) return Results.NotFound(); // Missing, or someone else's

            await titles.ExecuteUpdateAsync(s => s.SetProperty(t => t.NotDuplicate, request.NotDuplicate));
            return Results.NoContent();
        });
    }
}

// How duplicates combine into the title kept: watched or streaming if any was; rating, review,
// images and the Jellyfin and TMDB links from the kept title, or else the oldest other that has
// them; collections and genres together; the earliest date added; a show's largest season count.
// The Merge duplicates preview (features/duplicates/duplicates.ts) shows the same.
public static class TitleMerge
{
    public static void Combine(CatalogTitle keep, IReadOnlyList<CatalogTitle> others)
    {
        var all = others.Prepend(keep).ToList();
        T First<T>(Func<CatalogTitle, T> value, Func<T, bool> isSet) => all.Select(value).FirstOrDefault(isSet)!;

        keep.HasWatched = all.Any(t => t.HasWatched);
        keep.IsStreaming = all.Any(t => t.IsStreaming);
        keep.Rating = First(t => t.Rating, r => r > 0);
        keep.Review = First(t => t.Review, r => !string.IsNullOrWhiteSpace(r)) ?? string.Empty;
        keep.PosterPath = First(t => t.PosterPath, p => !string.IsNullOrEmpty(p)) ?? string.Empty;
        keep.BackdropPath = First(t => t.BackdropPath, p => !string.IsNullOrEmpty(p)) ?? string.Empty;
        keep.JellyfinItemId = First(t => t.JellyfinItemId, id => id is not null);
        keep.TmdbId = First(t => t.TmdbId, id => id is not null);
        if (keep.Year == 0) keep.Year = First(t => t.Year, y => y > 0);
        keep.Collections = all.SelectMany(t => t.Collections).Distinct().ToList();
        keep.Genres = all.SelectMany(t => t.Genres).Distinct().ToList();
        keep.CreatedAt = all.Min(t => t.CreatedAt);
        if (keep is TvShow show) show.TotalSeasons = all.OfType<TvShow>().Max(s => s.TotalSeasons);
    }
}
