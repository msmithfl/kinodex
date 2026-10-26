using System.Net;
using System.Net.Http.Json;
using Kinodex.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Tests;

[Collection(ApiCollection.Name)]
public class MovieTests(KinodexApiFactory api)
{
    [Fact]
    public async Task Created_movie_belongs_to_the_signed_in_user_not_the_request_body()
    {
        var userId = KinodexApiFactory.NewUserId();
        var id = await api.ClientFor(userId).CreateMovieAsync();

        var storedOwner = await api.WithDbAsync(db => db.Movies.Where(m => m.Id == id).Select(m => m.UserId).SingleAsync());
        Assert.Equal(userId, storedOwner);
    }

    [Fact]
    public async Task Users_only_see_their_own_movies()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        var aliceMovie = await alice.CreateMovieAsync("Alice's movie");
        var bobMovie = await bob.CreateMovieAsync("Bob's movie");

        var aliceList = await alice.GetJsonAsync("/api/movies");
        var ids = aliceList.EnumerateArray().Select(m => m.GetProperty("id").GetInt32()).ToList();

        Assert.Contains(aliceMovie, ids);
        Assert.DoesNotContain(bobMovie, ids);
    }

    [Fact]
    public async Task Owner_can_read_update_and_delete_a_movie()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await owner.CreateMovieAsync("Before");

        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/movies/{id}")).StatusCode);

        var update = await owner.PutAsJsonAsync($"/api/movies/{id}", TestData.Movie("After"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal("After", (await owner.GetJsonAsync($"/api/movies/{id}")).GetProperty("title").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/movies/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync($"/api/movies/{id}")).StatusCode);
    }

    [Fact]
    public async Task Another_user_cannot_read_update_or_delete_someone_elses_movie()
    {
        var ownerId = KinodexApiFactory.NewUserId();
        var id = await api.ClientFor(ownerId).CreateMovieAsync("Private");
        var stranger = api.ClientFor(KinodexApiFactory.NewUserId());

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/movies/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await stranger.PutAsJsonAsync($"/api/movies/{id}", TestData.Movie("Hijacked"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/movies/{id}")).StatusCode);

        // Still there, unchanged, and still the owner's
        var movie = await api.WithDbAsync(db => db.Movies.SingleAsync(m => m.Id == id));
        Assert.Equal("Private", movie.Title);
        Assert.Equal(ownerId, movie.UserId);
    }

    [Fact]
    public async Task Updating_a_movie_cannot_change_its_owner()
    {
        var ownerId = KinodexApiFactory.NewUserId();
        var owner = api.ClientFor(ownerId);
        var id = await owner.CreateMovieAsync();

        // The body names a different user; the server must keep the real owner
        await owner.PutAsJsonAsync($"/api/movies/{id}", TestData.Movie("Renamed"));

        var storedOwner = await api.WithDbAsync(db => db.Movies.Where(m => m.Id == id).Select(m => m.UserId).SingleAsync());
        Assert.Equal(ownerId, storedOwner);
    }

    [Fact]
    public async Task Csv_export_contains_only_the_users_own_movies()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        await alice.CreateMovieAsync("Alice Export Title");
        await bob.CreateMovieAsync("Bob Export Title");

        var csv = await (await alice.GetAsync("/api/movies/export/csv")).Content.ReadAsStringAsync();

        Assert.Contains("Alice Export Title", csv);
        Assert.DoesNotContain("Bob Export Title", csv);
    }
}
