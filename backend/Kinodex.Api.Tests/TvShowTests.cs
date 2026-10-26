using System.Net;
using System.Net.Http.Json;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

[Collection(ApiCollection.Name)]
public class TvShowTests(KinodexApiFactory api)
{
    private static object Show(string title = "The Wire") => new
    {
        userId = "someone-else",
        title,
        year = 2002,
        purchases = new[]
        {
            new { seasons = new[] { 1, 2 }, price = 19.99m, formats = new[] { "DVD" }, condition = "Good", purchasedAt = "2026-01-15" },
        },
    };

    private static async Task<int> CreateShowAsync(HttpClient client, string title = "The Wire")
    {
        var response = await client.PostAsJsonAsync("/api/tvshows", Show(title));
        response.EnsureSuccessStatusCode();
        return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
    }

    [Fact]
    public async Task Created_show_keeps_its_purchases()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await CreateShowAsync(owner);

        var show = await owner.GetJsonAsync($"/api/tvshows/{id}");
        var purchase = Assert.Single(show.GetProperty("purchases").EnumerateArray());
        Assert.Equal([1, 2], purchase.GetProperty("seasons").EnumerateArray().Select(s => s.GetInt32()));
        Assert.Equal(19.99m, purchase.GetProperty("price").GetDecimal());
    }

    [Fact]
    public async Task A_title_is_required()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());

        var response = await owner.PostAsJsonAsync("/api/tvshows", Show(title: "  "));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Another_user_cannot_see_or_delete_someone_elses_show()
    {
        var id = await CreateShowAsync(api.ClientFor(KinodexApiFactory.NewUserId()));
        var stranger = api.ClientFor(KinodexApiFactory.NewUserId());

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/tvshows/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/tvshows/{id}")).StatusCode);
        var strangerList = await stranger.GetJsonAsync("/api/tvshows");
        Assert.Empty(strangerList.EnumerateArray());
    }
}
