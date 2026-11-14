using System.Globalization;
using System.Text;

namespace Kinodex.Api.Services;

// Matches Kinodex titles with Jellyfin's (docs/design/jellyfin-compare.md): by TMDB id first, then
// by title and year for anything left. No I/O, so it's tested on its own.
public static class JellyfinCompare
{
    public record KinodexTitle(int Id, string Title, int Year, int? TmdbId);
    public record JellyfinTitle(string Id, string Title, int Year, int? TmdbId);

    // MatchedBy: "tmdb" (the same TMDB id) or "title" (the same title and year)
    public record TitleMatch(KinodexTitle Kinodex, JellyfinTitle Jellyfin, string MatchedBy);

    public record LibraryComparison(
        List<JellyfinTitle> OnlyOnJellyfin,
        List<KinodexTitle> OnlyInKinodex,
        List<TitleMatch> InBoth);

    public static LibraryComparison Compare(IReadOnlyList<KinodexTitle> kinodex, IReadOnlyList<JellyfinTitle> jellyfin)
    {
        var byTmdbId = jellyfin.Where(j => j.TmdbId is not null).ToLookup(j => j.TmdbId!.Value);
        var byTitle = jellyfin.ToLookup(j => TitleKey(j.Title));

        var inBoth = new List<TitleMatch>();
        var onlyInKinodex = new List<KinodexTitle>();
        var matchedJellyfinIds = new HashSet<string>();

        foreach (var title in kinodex)
        {
            var match = title.TmdbId is int tmdbId ? byTmdbId[tmdbId].FirstOrDefault() : null;
            var matchedBy = "tmdb";
            if (match is null)
            {
                match = byTitle[TitleKey(title.Title)].FirstOrDefault(j => SameYear(title.Year, j.Year) && !DifferentTmdbIds(title, j));
                matchedBy = "title";
            }

            if (match is null)
            {
                onlyInKinodex.Add(title);
            }
            else
            {
                // Two copies of a movie in Kinodex (say, two editions) both match the one file
                inBoth.Add(new TitleMatch(title, match, matchedBy));
                matchedJellyfinIds.Add(match.Id);
            }
        }

        var onlyOnJellyfin = jellyfin.Where(j => !matchedJellyfinIds.Contains(j.Id)).ToList();

        return new LibraryComparison(
            onlyOnJellyfin.OrderBy(j => SortKey(j.Title), StringComparer.InvariantCultureIgnoreCase).ThenBy(j => j.Year).ToList(),
            onlyInKinodex.OrderBy(k => SortKey(k.Title), StringComparer.InvariantCultureIgnoreCase).ThenBy(k => k.Year).ToList(),
            inBoth.OrderBy(m => SortKey(m.Kinodex.Title), StringComparer.InvariantCultureIgnoreCase).ThenBy(m => m.Kinodex.Year).ToList());
    }

    // Release years can differ by one between sources (a festival premiere, a time zone), and an
    // unknown year (0) matches any
    private static bool SameYear(int a, int b) => a == 0 || b == 0 || Math.Abs(a - b) <= 1;

    // Both have TMDB ids and they differ: different films, however alike their titles
    private static bool DifferentTmdbIds(KinodexTitle k, JellyfinTitle j) =>
        k.TmdbId is not null && j.TmdbId is not null && k.TmdbId != j.TmdbId;

    private static string SortKey(string title) => LibraryTitle.WithoutArticle(title);

    // A title reduced to what matters for matching: no leading article, accents, case or
    // punctuation ("The Lord of the Rings: The Fellowship..." and "Lord of the Rings - The
    // Fellowship..." meet)
    internal static string TitleKey(string title)
    {
        var decomposed = LibraryTitle.WithoutArticle(title).Normalize(NormalizationForm.FormD);
        var key = new StringBuilder(decomposed.Length);
        var lastWasSpace = true;
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (c is '\'' or '’') continue; // "Schindler's" and "Schindlers" meet
            if (char.IsLetterOrDigit(c))
            {
                key.Append(char.ToLowerInvariant(c));
                lastWasSpace = false;
            }
            else if (!lastWasSpace && (char.IsWhiteSpace(c) || char.IsPunctuation(c) || char.IsSymbol(c)))
            {
                key.Append(' ');
                lastWasSpace = true;
            }
        }
        return key.ToString().TrimEnd();
    }
}
