using System.Text.Json.Serialization;

namespace Kinodex.Api.Models;

// A film: everything it has is shared with TV shows (CatalogTitle), its copies included.
// Fields the API doesn't know are refused rather than ignored: a page still running the code from
// before copies (an open tab, the home screen app) would otherwise save a movie with no copies.
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class Movie : CatalogTitle
{
}
