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
    public async Task Purchase_date_defaults_to_today_and_can_be_set_and_changed()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

        // Not given: today
        var id = await owner.CreateMovieAsync();
        Assert.Equal(today, (await owner.GetJsonAsync($"/api/movies/{id}")).GetProperty("purchasedAt").GetString());

        // Given on create (a movie bought before it was logged)
        var created = await owner.PostAsJsonAsync("/api/movies", TestData.Movie("Old Purchase", purchasedAt: "2019-05-04"));
        var oldId = (await created.ReadJsonAsync()).GetProperty("id").GetInt32();
        Assert.Equal("2019-05-04", (await owner.GetJsonAsync($"/api/movies/{oldId}")).GetProperty("purchasedAt").GetString());

        // Changed on edit
        await owner.PutAsJsonAsync($"/api/movies/{oldId}", TestData.Movie("Old Purchase", purchasedAt: "2020-12-25"));
        Assert.Equal("2020-12-25", (await owner.GetJsonAsync($"/api/movies/{oldId}")).GetProperty("purchasedAt").GetString());

        // An edit that doesn't include one leaves it alone
        await owner.PutAsJsonAsync($"/api/movies/{oldId}", TestData.Movie("Renamed"));
        Assert.Equal("2020-12-25", (await owner.GetJsonAsync($"/api/movies/{oldId}")).GetProperty("purchasedAt").GetString());
    }

    [Fact]
    public async Task Csv_import_keeps_purchase_dates_and_falls_back_to_date_added_for_older_files()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        const string header = "Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,On Plex,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added";
        var csv =
            header + ",Purchase Date\n" +
            "\"With Date\",,2001,\"\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,,\"\",\"\",\"\",2024-03-10,2015-07-01\n";
        var olderCsv =
            header + "\n" +
            "\"Without Date\",,2002,\"\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,,\"\",\"\",\"\",2024-03-10\n";

        foreach (var file in new[] { csv, olderCsv })
        {
            using var form = new MultipartFormDataContent { { new StringContent(file), "file", "movies.csv" } };
            (await owner.PostAsync("/api/movies/import/csv", form)).EnsureSuccessStatusCode();
        }

        var movies = (await owner.GetJsonAsync("/api/movies")).EnumerateArray()
            .ToDictionary(m => m.GetProperty("title").GetString()!, m => m.GetProperty("purchasedAt").GetString());
        Assert.Equal("2015-07-01", movies["With Date"]);
        Assert.Equal("2024-03-10", movies["Without Date"]);

        var exported = await (await owner.GetAsync("/api/movies/export/csv")).Content.ReadAsStringAsync();
        Assert.Contains(",2024-03-10,2015-07-01", exported);
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
