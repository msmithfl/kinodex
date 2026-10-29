using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

[Collection(ApiCollection.Name)]
public class MoviePresetTests(KinodexApiFactory api)
{
    private static object Bookstore(string name = "Bookstore") => new
    {
        name,
        upcNumber = "012345678905",
        collections = new[] { "Star Wars" },
        formats = new[] { "DVD" },
        condition = "Good",
        purchasePrice = 1f,
        purchasedAt = (string?)null,
        rating = 0f,
        review = "",
        productPosterPath = "",
        isGift = false,
        hasWatched = true,
        isStreaming = false,
        shelfSection = "",
        shelfNumber = 0,
        hdDriveNumber = 0,
    };

    [Fact]
    public async Task Presets_are_saved_per_user_and_listed_by_name()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());

        Assert.Equal(HttpStatusCode.Created, (await alice.PostAsJsonAsync("/api/movie-presets", Bookstore("Thrift"))).StatusCode);
        await alice.PostAsJsonAsync("/api/movie-presets", Bookstore());

        var presets = await alice.GetJsonAsync("/api/movie-presets");
        Assert.Equal(["Bookstore", "Thrift"], presets.EnumerateArray().Select(p => p.GetProperty("name").GetString()));
        var bookstore = presets[0];
        Assert.Equal("DVD", bookstore.GetProperty("formats")[0].GetString());
        Assert.Equal(1f, bookstore.GetProperty("purchasePrice").GetSingle());
        Assert.True(bookstore.GetProperty("hasWatched").GetBoolean());
        Assert.Equal("012345678905", bookstore.GetProperty("upcNumber").GetString());
        Assert.Equal("Star Wars", bookstore.GetProperty("collections")[0].GetString());
        // No fixed date: the day the movie is added
        Assert.Equal(JsonValueKind.Null, bookstore.GetProperty("purchasedAt").ValueKind);

        Assert.Empty((await bob.GetJsonAsync("/api/movie-presets")).EnumerateArray());
    }

    [Fact]
    public async Task Preset_names_must_be_unique_and_not_blank()
    {
        var client = api.ClientFor(KinodexApiFactory.NewUserId());
        await client.PostAsJsonAsync("/api/movie-presets", Bookstore());

        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/movie-presets", Bookstore(" bookstore "))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/movie-presets", Bookstore("  "))).StatusCode);
        // Another user can use the same name
        var other = api.ClientFor(KinodexApiFactory.NewUserId());
        Assert.Equal(HttpStatusCode.Created, (await other.PostAsJsonAsync("/api/movie-presets", Bookstore())).StatusCode);
    }

    [Fact]
    public async Task Presets_can_be_updated_and_deleted_only_by_their_owner()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        var created = await (await alice.PostAsJsonAsync("/api/movie-presets", Bookstore())).ReadJsonAsync();
        var id = created.GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NotFound, (await bob.PutAsJsonAsync($"/api/movie-presets/{id}", Bookstore("Mine"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"/api/movie-presets/{id}")).StatusCode);

        var renamed = await (await alice.PutAsJsonAsync($"/api/movie-presets/{id}", Bookstore("Used DVDs"))).ReadJsonAsync();
        Assert.Equal("Used DVDs", renamed.GetProperty("name").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await alice.DeleteAsync($"/api/movie-presets/{id}")).StatusCode);
        Assert.Empty((await alice.GetJsonAsync("/api/movie-presets")).EnumerateArray());
    }
}
