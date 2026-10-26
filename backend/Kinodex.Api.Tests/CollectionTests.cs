using System.Net;
using System.Net.Http.Json;
using Kinodex.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Tests;

// Movies refer to collections by name, so renames and deletes have to update them
[Collection(ApiCollection.Name)]
public class CollectionTests(KinodexApiFactory api)
{
    private static object Update(string name) => new { name, isDirectorCollection = false, imageUrl = (string?)null, backdropUrl = (string?)null };

    private Task<List<string>> MovieCollectionsAsync(int movieId) =>
        api.WithDbAsync(db => db.Movies.Where(m => m.Id == movieId).Select(m => m.Collections).SingleAsync());

    [Fact]
    public async Task Renaming_a_collection_renames_it_on_the_users_movies()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var collectionId = await owner.CreateCollectionAsync("Halloween");
        var movieId = await owner.CreateMovieAsync("Halloween (1978)", ["Halloween"]);

        var response = await owner.PutAsJsonAsync($"/api/collections/{collectionId}", Update("Spooky Season"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["Spooky Season"], await MovieCollectionsAsync(movieId));
    }

    [Fact]
    public async Task Renaming_only_touches_the_owners_movies()
    {
        // Two users who happen to have a collection with the same name
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        var aliceCollection = await alice.CreateCollectionAsync("Criterion");
        await bob.CreateCollectionAsync("Criterion");
        var bobMovie = await bob.CreateMovieAsync("Seven Samurai", ["Criterion"]);

        await alice.PutAsJsonAsync($"/api/collections/{aliceCollection}", Update("Criterion Closet"));

        Assert.Equal(["Criterion"], await MovieCollectionsAsync(bobMovie));
    }

    [Fact]
    public async Task Deleting_a_collection_removes_it_from_the_users_movies()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var collectionId = await owner.CreateCollectionAsync("Westerns");
        var movieId = await owner.CreateMovieAsync("Unforgiven", ["Westerns", "Eastwood"]);

        var response = await owner.DeleteAsync($"/api/collections/{collectionId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["Eastwood"], await MovieCollectionsAsync(movieId));
    }

    [Fact]
    public async Task Another_user_cannot_rename_or_delete_someone_elses_collection()
    {
        var collectionId = await api.ClientFor(KinodexApiFactory.NewUserId()).CreateCollectionAsync("Mine");
        var stranger = api.ClientFor(KinodexApiFactory.NewUserId());

        Assert.Equal(HttpStatusCode.NotFound,
            (await stranger.PutAsJsonAsync($"/api/collections/{collectionId}", Update("Taken"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/collections/{collectionId}")).StatusCode);

        var name = await api.WithDbAsync(db => db.Collections.Where(c => c.Id == collectionId).Select(c => c.Name).SingleAsync());
        Assert.Equal("Mine", name);
    }

    [Fact]
    public async Task Checklist_items_can_only_be_added_to_your_own_collection()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var collectionId = await owner.CreateCollectionAsync("Nolan");
        var stranger = api.ClientFor(KinodexApiFactory.NewUserId());
        var item = new { title = "Memento", year = 2000, tmdbId = 77 };

        var strangerAdd = await stranger.PostAsJsonAsync($"/api/collections/{collectionId}/items", item);
        var ownerAdd = await owner.PostAsJsonAsync($"/api/collections/{collectionId}/items", item);

        Assert.Equal(HttpStatusCode.NotFound, strangerAdd.StatusCode);
        Assert.Equal(HttpStatusCode.Created, ownerAdd.StatusCode);
        var items = await owner.GetJsonAsync($"/api/collections/{collectionId}/items");
        Assert.Equal("Memento", Assert.Single(items.EnumerateArray()).GetProperty("title").GetString());
        Assert.Empty((await stranger.GetJsonAsync("/api/collections/items/all")).EnumerateObject());
    }
}
