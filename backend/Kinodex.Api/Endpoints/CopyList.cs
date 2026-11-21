using Kinodex.Api.Models;

namespace Kinodex.Api.Endpoints;

// Saving a title's copies (docs/design/titles-and-copies.md). The request's list is what the title
// has afterwards: copies are matched by id and updated in place, so each keeps its id; new ones (no
// id, or an id that isn't one of this title's copies) are added; ones left out are removed.
public static class CopyList
{
    // A message naming the title and copy when the copies can't be saved. totalSeasons is null for
    // a movie (whose copies have no seasons), and 0 for a show when TMDB's count isn't known.
    public static string? Validate(string title, IReadOnlyList<Copy> copies, int? totalSeasons)
    {
        for (var i = 0; i < copies.Count; i++)
        {
            var copy = copies[i];
            var label = $"{title}, copy {i + 1}";

            if (copy.Price < 0) return $"{label} has a negative price.";
            if (totalSeasons is not { } total) continue;

            if (copy.Seasons is not { Count: > 0 }) return $"{label} doesn't cover any seasons.";
            if (copy.Seasons.Any(s => s < 1)) return $"{label} has a season number below 1.";
            if (total > 0 && copy.Seasons.Any(s => s > total))
                return $"{label} includes a season past season {total}, the last season.";
        }

        return null;
    }

    // The copies of a title being created; ids from the client are ignored
    public static List<Copy> ForNewTitle(IEnumerable<Copy> copies, bool isShow) =>
        copies.Select(c => Fill(new Copy(), c, isShow, isNew: true)).ToList();

    // Makes the stored title's copies (loaded with it) match the request's
    public static void Update(CatalogTitle title, IEnumerable<Copy> requested, bool isShow)
    {
        var unmatched = title.Copies.ToDictionary(c => c.Id);
        var added = new List<Copy>();

        foreach (var copy in requested)
        {
            if (copy.Id != 0 && unmatched.Remove(copy.Id, out var stored))
                Fill(stored, copy, isShow, isNew: false);
            else
                added.Add(Fill(new Copy(), copy, isShow, isNew: true));
        }

        foreach (var removed in unmatched.Values) title.Copies.Remove(removed);
        title.Copies.AddRange(added);
    }

    // Earliest bought first, as they're listed everywhere
    public static void Sort(CatalogTitle title) =>
        title.Copies = title.Copies.OrderBy(c => c.PurchasedAt).ThenBy(c => c.Id).ToList();

    private static Copy Fill(Copy target, Copy source, bool isShow, bool isNew)
    {
        target.Seasons = isShow ? (source.Seasons ?? []).Distinct().Order().ToList() : [];
        target.UpcNumber = source.UpcNumber ?? string.Empty;
        target.Formats = source.Formats ?? [];
        target.Condition = source.Condition ?? string.Empty;
        target.Price = source.Price;
        // Left as it was when the request doesn't include one; today for a new copy
        if (source.PurchasedAt != default) target.PurchasedAt = source.PurchasedAt;
        else if (isNew) target.PurchasedAt = DateOnly.FromDateTime(DateTime.UtcNow);
        target.IsGift = source.IsGift;
        target.ProductPosterPath = source.ProductPosterPath ?? string.Empty;
        target.ShelfSection = source.ShelfSection ?? string.Empty;
        target.ShelfNumber = source.ShelfNumber;
        target.HDDriveNumber = source.HDDriveNumber;
        if (isNew) target.CreatedAt = DateTime.UtcNow; // The server's "date added", not the client's
        return target;
    }
}
