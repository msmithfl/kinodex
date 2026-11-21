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
        copies = new[]
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
    public async Task Created_show_keeps_its_copies()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await CreateShowAsync(owner);

        var show = await owner.GetJsonAsync($"/api/tvshows/{id}");
        var copy = Assert.Single(show.GetProperty("copies").EnumerateArray());
        Assert.Equal([1, 2], copy.GetProperty("seasons").EnumerateArray().Select(s => s.GetInt32()));
        Assert.Equal(19.99m, copy.GetProperty("price").GetDecimal());
    }

    [Fact]
    public async Task Each_copy_can_be_a_gift_on_its_own()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await CreateShowAsync(owner);
        var created = Assert.Single((await owner.GetJsonAsync($"/api/tvshows/{id}")).GetProperty("copies").EnumerateArray());
        Assert.False(created.GetProperty("isGift").GetBoolean());

        // Season 1 bought, season 2 a gift
        var update = await owner.PutAsJsonAsync($"/api/tvshows/{id}", new
        {
            title = "The Wire",
            year = 2002,
            copies = new[]
            {
                new { seasons = new[] { 1 }, price = 9.99m, formats = new[] { "DVD" }, condition = "Good", purchasedAt = "2026-01-15", isGift = false },
                new { seasons = new[] { 2 }, price = 0m, formats = new[] { "DVD" }, condition = "Good", purchasedAt = "2026-02-01", isGift = true },
            },
        });
        update.EnsureSuccessStatusCode();

        var gifts = (await owner.GetJsonAsync($"/api/tvshows/{id}")).GetProperty("copies").EnumerateArray()
            .ToDictionary(p => p.GetProperty("seasons")[0].GetInt32(), p => p.GetProperty("isGift").GetBoolean());
        Assert.False(gifts[1]);
        Assert.True(gifts[2]);
    }

    [Fact]
    public async Task Each_copy_keeps_its_own_product_image()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await CreateShowAsync(owner);

        // Season 1 on its own with its box art, then a later box set without one
        var update = await owner.PutAsJsonAsync($"/api/tvshows/{id}", new
        {
            title = "The Wire",
            year = 2002,
            copies = new[]
            {
                new { seasons = new[] { 1 }, price = 9.99m, purchasedAt = "2026-01-15", upcNumber = "012345678905", productPosterPath = "https://example.com/season-1.jpg" },
                new { seasons = new[] { 2, 3 }, price = 24.99m, purchasedAt = "2026-02-01", upcNumber = "", productPosterPath = "" },
            },
        });
        update.EnsureSuccessStatusCode();

        var images = (await owner.GetJsonAsync($"/api/tvshows/{id}")).GetProperty("copies").EnumerateArray()
            .ToDictionary(p => p.GetProperty("seasons")[0].GetInt32(), p => p.GetProperty("productPosterPath").GetString());
        Assert.Equal("https://example.com/season-1.jpg", images[1]);
        Assert.Equal("", images[2]);
    }

    [Fact]
    public async Task A_shows_copy_keeps_its_id_and_has_a_shelf_and_hdd_of_its_own()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await CreateShowAsync(owner);
        var copyId = (await owner.GetJsonAsync($"/api/tvshows/{id}")).GetProperty("copies")[0].GetProperty("id").GetInt32();

        var update = await owner.PutAsJsonAsync($"/api/tvshows/{id}", new
        {
            title = "The Wire",
            year = 2002,
            collections = new[] { "HBO" },
            copies = new[]
            {
                new { id = copyId, seasons = new[] { 1, 2 }, price = 19.99m, shelfSection = "TV", shelfNumber = 4, hdDriveNumber = 3 },
            },
        });
        update.EnsureSuccessStatusCode();

        var show = await owner.GetJsonAsync($"/api/tvshows/{id}");
        var copy = Assert.Single(show.GetProperty("copies").EnumerateArray());
        Assert.Equal(copyId, copy.GetProperty("id").GetInt32());
        Assert.Equal("TV", copy.GetProperty("shelfSection").GetString());
        Assert.Equal(4, copy.GetProperty("shelfNumber").GetInt32());
        Assert.Equal(3, copy.GetProperty("hdDriveNumber").GetInt32());
        Assert.Equal(["HBO"], show.GetProperty("collections").EnumerateArray().Select(c => c.GetString()));
    }

    [Fact]
    public async Task A_copy_must_cover_a_season_and_none_past_the_last()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());

        var none = await owner.PostAsJsonAsync("/api/tvshows", new { title = "Lost", copies = new[] { new { seasons = Array.Empty<int>() } } });
        var past = await owner.PostAsJsonAsync("/api/tvshows", new { title = "Lost", totalSeasons = 6, copies = new[] { new { seasons = new[] { 7 } } } });

        Assert.Equal(HttpStatusCode.BadRequest, none.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, past.StatusCode);
    }

    [Fact]
    public async Task A_page_from_before_copies_cannot_save_a_show_and_lose_its_copies()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await CreateShowAsync(owner);

        var oldShape = new { title = "The Wire", year = 2002, purchases = Array.Empty<object>() };
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PutAsJsonAsync($"/api/tvshows/{id}", oldShape)).StatusCode);

        Assert.Single((await owner.GetJsonAsync($"/api/tvshows/{id}")).GetProperty("copies").EnumerateArray());
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
