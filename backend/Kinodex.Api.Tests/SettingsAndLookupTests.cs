using System.Net;
using System.Net.Http.Json;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

[Collection(ApiCollection.Name)]
public class SettingsAndLookupTests(KinodexApiFactory api)
{
    [Fact]
    public async Task Settings_have_defaults_and_are_saved_per_user()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());

        // Never saved: the default
        Assert.True((await alice.GetJsonAsync("/api/settings")).GetProperty("showCollectionCompletion").GetBoolean());

        await alice.PutAsJsonAsync("/api/settings", new { showCollectionCompletion = false });

        Assert.False((await alice.GetJsonAsync("/api/settings")).GetProperty("showCollectionCompletion").GetBoolean());
        Assert.True((await bob.GetJsonAsync("/api/settings")).GetProperty("showCollectionCompletion").GetBoolean());
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("1234567")]          // too short
    [InlineData("123456789012345")]  // too long
    public async Task Upc_lookup_rejects_bad_upcs_without_calling_out(string upc)
    {
        var client = api.ClientFor(KinodexApiFactory.NewUserId());

        var response = await client.GetAsync($"/api/upc/lookup/{upc}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("account")]
    [InlineData("movie/603/credits")]
    [InlineData("search/collection?query=alien")]
    [InlineData("tv/abc")]
    public async Task Tmdb_passes_on_only_the_requests_the_app_makes(string path)
    {
        var client = api.ClientFor(KinodexApiFactory.NewUserId());

        var response = await client.GetAsync($"/api/tmdb/v3/{path}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Tmdb_says_when_this_server_has_no_key()
    {
        // The test server has no TMDB_API_KEY, so this never reaches TMDB
        var client = api.ClientFor(KinodexApiFactory.NewUserId());

        var response = await client.GetAsync("/api/tmdb/v3/search/movie?query=alien");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }
}
