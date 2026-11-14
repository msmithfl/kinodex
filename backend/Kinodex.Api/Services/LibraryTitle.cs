using System.Text.RegularExpressions;

namespace Kinodex.Api.Services;

// Titles the way a library catalogue writes them, for the CSV: a leading "A", "An" or "The" moves
// to the end ("The Thing" becomes "Thing, The"), so a spreadsheet sorted by title files it under T,
// like the app's lists do. Importing turns it back ("Thing, The" becomes "The Thing"), so an
// export round-trips. The article has to be a word of its own ("Theater Camp" stays as it is).
public static partial class LibraryTitle
{
    [GeneratedRegex(@"^(?<article>the|an|a)\s+(?<rest>\S.*)$", RegexOptions.IgnoreCase)]
    private static partial Regex LeadingArticle();

    [GeneratedRegex(@"^(?<rest>.*\S),\s*(?<article>the|an|a)$", RegexOptions.IgnoreCase)]
    private static partial Regex TrailingArticle();

    public static string ToLibrary(string title)
    {
        var match = LeadingArticle().Match(title.Trim());
        return match.Success ? $"{match.Groups["rest"].Value}, {match.Groups["article"].Value}" : title;
    }

    public static string FromLibrary(string title)
    {
        var match = TrailingArticle().Match(title.Trim());
        return match.Success ? $"{match.Groups["article"].Value} {match.Groups["rest"].Value}" : title;
    }
}
