using System.Text.Json.Serialization;

namespace Kinodex.Api.Models;

// A show. Its copies each cover some of its seasons (Copy.Seasons); owned seasons, total paid and
// "complete" are all worked out from them. Unknown fields are refused, as for Movie.
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class TvShow : CatalogTitle
{
    public int TotalSeasons { get; set; } // Season count from TMDB, 0 when unknown
}
