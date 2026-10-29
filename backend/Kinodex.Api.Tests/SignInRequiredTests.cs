using System.Net;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

// Every data endpoint refuses signed-out requests
[Collection(ApiCollection.Name)]
public class SignInRequiredTests(KinodexApiFactory api)
{
    [Theory]
    [InlineData("GET", "/api/movies")]
    [InlineData("GET", "/api/movies/1")]
    [InlineData("DELETE", "/api/movies/1")]
    [InlineData("GET", "/api/movies/export/csv")]
    [InlineData("GET", "/api/tvshows")]
    [InlineData("GET", "/api/tvshows/1")]
    [InlineData("GET", "/api/collections")]
    [InlineData("GET", "/api/collections/items/all")]
    [InlineData("GET", "/api/collections/1/items")]
    [InlineData("GET", "/api/shelfsections")]
    [InlineData("GET", "/api/settings")]
    [InlineData("GET", "/api/movie-presets")]
    [InlineData("DELETE", "/api/movie-presets/1")]
    [InlineData("GET", "/api/upc/lookup/012345678905")]
    [InlineData("GET", "/api/tmdb/unmatched")]
    [InlineData("POST", "/api/tmdb/fill-images")]
    [InlineData("GET", "/api/customers")]
    [InlineData("GET", "/api/checkouts")]
    public async Task Signed_out_requests_are_rejected(string method, string url)
    {
        var client = api.ClientFor(null);

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
