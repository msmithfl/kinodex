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
        Assert.Equal(today, (await FirstCopyAsync(owner, id)).GetProperty("purchasedAt").GetString());

        // Given on create (a movie bought before it was logged)
        var created = await owner.PostAsJsonAsync("/api/movies", TestData.Movie("Old Purchase", null, TestData.Copy(purchasedAt: "2019-05-04")));
        var oldId = (await created.ReadJsonAsync()).GetProperty("id").GetInt32();
        var copy = await FirstCopyAsync(owner, oldId);
        var copyId = copy.GetProperty("id").GetInt32();
        Assert.Equal("2019-05-04", copy.GetProperty("purchasedAt").GetString());

        // Changed on edit
        await owner.PutAsJsonAsync($"/api/movies/{oldId}", TestData.Movie("Old Purchase", null, TestData.Copy(purchasedAt: "2020-12-25", id: copyId)));
        Assert.Equal("2020-12-25", (await FirstCopyAsync(owner, oldId)).GetProperty("purchasedAt").GetString());

        // An edit that doesn't include one leaves it alone
        await owner.PutAsJsonAsync($"/api/movies/{oldId}", TestData.Movie("Renamed", null, TestData.Copy(id: copyId)));
        Assert.Equal("2020-12-25", (await FirstCopyAsync(owner, oldId)).GetProperty("purchasedAt").GetString());
    }

    [Fact]
    public async Task A_copy_is_not_a_gift_until_marked_as_one()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await owner.CreateMovieAsync();
        var copy = await FirstCopyAsync(owner, id);
        Assert.False(copy.GetProperty("isGift").GetBoolean());

        var gift = TestData.Copy(id: copy.GetProperty("id").GetInt32());
        gift["isGift"] = true;
        (await owner.PutAsJsonAsync($"/api/movies/{id}", TestData.Movie("Alien", null, gift))).EnsureSuccessStatusCode();

        Assert.True((await FirstCopyAsync(owner, id)).GetProperty("isGift").GetBoolean());
    }

    [Fact]
    public async Task Saving_a_movie_keeps_its_copies_ids_adds_new_ones_and_removes_the_ones_left_out()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var created = await owner.PostAsJsonAsync("/api/movies",
            TestData.Movie("Die Hard", null, TestData.Copy("VHS", "1990-01-01"), TestData.Copy("DVD", "2001-01-01")));
        var movie = await created.ReadJsonAsync();
        var id = movie.GetProperty("id").GetInt32();
        var (vhs, dvd) = (CopyId(movie, 0), CopyId(movie, 1));

        // The VHS rips to drive 2; the DVD goes; a Blu-ray arrives
        var update = await owner.PutAsJsonAsync($"/api/movies/{id}", TestData.Movie("Die Hard", null,
            TestData.Copy("VHS", "1990-01-01", id: vhs, hdd: 2), TestData.Copy("Blu-ray", "2010-01-01")));
        update.EnsureSuccessStatusCode();

        var copies = (await owner.GetJsonAsync($"/api/movies/{id}")).GetProperty("copies").EnumerateArray().ToList();
        Assert.Equal(2, copies.Count);
        Assert.Equal(vhs, copies[0].GetProperty("id").GetInt32()); // The same copy, changed
        Assert.Equal(2, copies[0].GetProperty("hdDriveNumber").GetInt32());
        Assert.Equal("Blu-ray", copies[1].GetProperty("formats")[0].GetString());
        Assert.NotEqual(dvd, copies[1].GetProperty("id").GetInt32());
        Assert.False(await api.WithDbAsync(db => db.Copies.AnyAsync(c => c.Id == dvd)));
    }

    [Fact]
    public async Task A_movie_can_have_no_copies_and_deleting_one_deletes_its_copies()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await owner.CreateMovieAsync();
        var copyId = (await FirstCopyAsync(owner, id)).GetProperty("id").GetInt32();

        var body = (Dictionary<string, object>)TestData.Movie();
        body["copies"] = Array.Empty<object>();
        (await owner.PutAsJsonAsync($"/api/movies/{id}", body)).EnsureSuccessStatusCode();
        Assert.Empty((await owner.GetJsonAsync($"/api/movies/{id}")).GetProperty("copies").EnumerateArray());

        var other = await owner.CreateMovieAsync("Aliens");
        var otherCopy = (await FirstCopyAsync(owner, other)).GetProperty("id").GetInt32();
        (await owner.DeleteAsync($"/api/movies/{other}")).EnsureSuccessStatusCode();
        Assert.False(await api.WithDbAsync(db => db.Copies.AnyAsync(c => c.Id == copyId || c.Id == otherCopy)));
    }

    [Fact]
    public async Task Another_users_copy_id_is_a_new_copy_not_theirs()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        var aliceMovie = await alice.CreateMovieAsync("Alice's movie");
        var aliceCopy = (await FirstCopyAsync(alice, aliceMovie)).GetProperty("id").GetInt32();
        var bobMovie = await bob.CreateMovieAsync("Bob's movie");

        (await bob.PutAsJsonAsync($"/api/movies/{bobMovie}", TestData.Movie("Bob's movie", null, TestData.Copy("VHS", id: aliceCopy))))
            .EnsureSuccessStatusCode();

        Assert.NotEqual(aliceCopy, (await FirstCopyAsync(bob, bobMovie)).GetProperty("id").GetInt32());
        Assert.Equal("Blu-ray", (await FirstCopyAsync(alice, aliceMovie)).GetProperty("formats")[0].GetString());
    }

    [Fact]
    public async Task A_movies_copies_have_no_seasons_and_no_negative_price()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var copy = TestData.Copy();
        copy["seasons"] = new[] { 1 };
        var created = await (await owner.PostAsJsonAsync("/api/movies", TestData.Movie("Alien", null, copy))).ReadJsonAsync();
        Assert.Empty(created.GetProperty("copies")[0].GetProperty("seasons").EnumerateArray());

        var negative = await owner.PostAsJsonAsync("/api/movies", TestData.Movie("Alien", null, TestData.Copy(price: -1)));
        Assert.Equal(HttpStatusCode.BadRequest, negative.StatusCode);
    }

    [Fact]
    public async Task A_shows_id_is_not_a_movie()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var show = await owner.PostAsJsonAsync("/api/tvshows", new { title = "The Wire", year = 2002, copies = Array.Empty<object>() });
        var showId = (await show.ReadJsonAsync()).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync($"/api/movies/{showId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.DeleteAsync($"/api/movies/{showId}")).StatusCode);
        Assert.DoesNotContain(showId, (await owner.GetJsonAsync("/api/movies")).EnumerateArray().Select(m => m.GetProperty("id").GetInt32()));
    }

    [Fact]
    public async Task A_page_from_before_copies_cannot_save_a_movie_and_lose_its_copies()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var id = await owner.CreateMovieAsync();

        // How a movie was saved before copies: physical fields on the movie, no copies
        var oldShape = new { title = "Alien", year = 1979, upcNumber = "012345678905", formats = new[] { "Blu-ray" }, condition = "Good" };
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PutAsJsonAsync($"/api/movies/{id}", oldShape)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync("/api/movies", oldShape)).StatusCode);

        Assert.Single((await owner.GetJsonAsync($"/api/movies/{id}")).GetProperty("copies").EnumerateArray());
    }

    [Fact]
    public async Task Csv_import_keeps_purchase_dates_and_falls_back_to_date_added_for_older_files()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        const string header = "Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,Streaming,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added";
        var csv =
            header + ",Purchase Date,Gift\n" +
            "\"With Date\",,2001,\"\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,,\"\",\"\",\"\",2024-03-10,2015-07-01,True\n";
        var olderCsv =
            header + "\n" +
            "\"Without Date\",,2002,\"\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,,\"\",\"\",\"\",2024-03-10\n";

        foreach (var file in new[] { csv, olderCsv })
            await ImportCsvAsync(owner, file);

        var copies = (await owner.GetJsonAsync("/api/movies")).EnumerateArray()
            .ToDictionary(m => m.GetProperty("title").GetString()!, m => Assert.Single(m.GetProperty("copies").EnumerateArray()));
        Assert.Equal("2015-07-01", copies["With Date"].GetProperty("purchasedAt").GetString());
        Assert.True(copies["With Date"].GetProperty("isGift").GetBoolean());
        Assert.Equal(5m, copies["With Date"].GetProperty("price").GetDecimal());
        Assert.Equal("2024-03-10", copies["Without Date"].GetProperty("purchasedAt").GetString());
        Assert.False(copies["Without Date"].GetProperty("isGift").GetBoolean());

        var exported = await (await owner.GetAsync("/api/movies/export/csv")).Content.ReadAsStringAsync();
        Assert.Contains(",2024-03-10,2015-07-01,True", exported);
    }

    [Fact]
    public async Task Csv_export_has_a_row_per_copy_and_import_puts_them_back_on_one_movie()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var dieHard = (Dictionary<string, object>)TestData.Movie("Die Hard", ["Action"],
            TestData.Copy("VHS", "1990-01-01", price: 3.5m), TestData.Copy("Blu-ray", "2010-01-01", price: 12m, hdd: 2));
        dieHard["tmdbId"] = 562;
        (await owner.PostAsJsonAsync("/api/movies", dieHard)).EnsureSuccessStatusCode();
        var noCopies = (Dictionary<string, object>)TestData.Movie("Heat");
        noCopies["copies"] = Array.Empty<object>();
        (await owner.PostAsJsonAsync("/api/movies", noCopies)).EnsureSuccessStatusCode();

        var exported = await (await owner.GetAsync("/api/movies/export/csv")).Content.ReadAsStringAsync();
        var rows = exported.Split('\n', StringSplitOptions.RemoveEmptyEntries).Skip(1).ToList();
        Assert.Equal(2, rows.Count(r => r.StartsWith("\"Die Hard\"")));
        Assert.Single(rows, r => r.StartsWith("\"Heat\""));
        Assert.Contains(rows, r => r.Contains(",3.50,")); // Stored to the cent

        var other = api.ClientFor(KinodexApiFactory.NewUserId());
        await ImportCsvAsync(other, exported);

        var movies = (await other.GetJsonAsync("/api/movies")).EnumerateArray()
            .ToDictionary(m => m.GetProperty("title").GetString()!);
        Assert.Equal(2, movies.Count);
        var copies = movies["Die Hard"].GetProperty("copies").EnumerateArray().ToList();
        Assert.Equal(["VHS", "Blu-ray"], copies.Select(c => c.GetProperty("formats")[0].GetString()));
        Assert.Equal(2, copies[1].GetProperty("hdDriveNumber").GetInt32());
        Assert.Equal(12m, copies[1].GetProperty("price").GetDecimal());
        Assert.Empty(movies["Heat"].GetProperty("copies").EnumerateArray());

        // The same file again: every copy is already there (by UPC), and the copyless movie too
        await ImportCsvAsync(other, exported);
        Assert.Equal(2, (await other.GetJsonAsync("/api/movies")).GetArrayLength());
        Assert.Equal(2, (await other.GetJsonAsync("/api/movies")).EnumerateArray()
            .Single(m => m.GetProperty("title").GetString() == "Die Hard").GetProperty("copies").GetArrayLength());
    }

    private static async Task<System.Text.Json.JsonElement> FirstCopyAsync(HttpClient client, int movieId) =>
        (await client.GetJsonAsync($"/api/movies/{movieId}")).GetProperty("copies")[0];

    private static int CopyId(System.Text.Json.JsonElement movie, int index) =>
        movie.GetProperty("copies")[index].GetProperty("id").GetInt32();

    private static async Task ImportCsvAsync(HttpClient client, string csv)
    {
        using var form = new MultipartFormDataContent { { new StringContent(csv), "file", "movies.csv" } };
        (await client.PostAsync("/api/movies/import/csv", form)).EnsureSuccessStatusCode();
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

    [Fact]
    public async Task Csv_export_writes_titles_library_style_and_in_that_order()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        foreach (var title in new[] { "The Thing", "A Clockwork Orange", "Theater Camp", "Blade Runner", "An Education" })
            await owner.CreateMovieAsync(title);

        var csv = await (await owner.GetAsync("/api/movies/export/csv")).Content.ReadAsStringAsync();
        var titles = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries).Skip(1)
            .Select(line => line[1..line.IndexOf("\",", StringComparison.Ordinal)]);

        // "Theater Camp" has no article of its own, so it stays as it is
        Assert.Equal(["Blade Runner", "Clockwork Orange, A", "Education, An", "Theater Camp", "Thing, The"], titles);
    }

    [Fact]
    public async Task Csv_import_turns_library_style_titles_back()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var csv =
            "Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,Streaming,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added,Purchase Date,Gift\n" +
            "\"Thing, The\",,1982,\"\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,,\"\",\"\",\"\",2024-03-10,2024-03-10,False\n" +
            "\"Paris, Texas\",,1984,\"\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,,\"\",\"\",\"\",2024-03-10,2024-03-10,False\n";

        using var form = new MultipartFormDataContent { { new StringContent(csv), "file", "movies.csv" } };
        (await owner.PostAsync("/api/movies/import/csv", form)).EnsureSuccessStatusCode();

        var titles = (await owner.GetJsonAsync("/api/movies")).EnumerateArray()
            .Select(m => m.GetProperty("title").GetString()).Order();
        Assert.Equal(["Paris, Texas", "The Thing"], titles);
    }
}
