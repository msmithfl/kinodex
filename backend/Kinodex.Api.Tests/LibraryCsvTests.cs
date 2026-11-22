using System.Net.Http.Json;
using System.Text.Json;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

// The library CSV (movies and TV shows in one file): GET /api/titles/export/csv and
// POST /api/titles/import/csv. The movie-only cases are in MovieTests.
[Collection(ApiCollection.Name)]
public class LibraryCsvTests(KinodexApiFactory api)
{
    private const string OlderHeader = "Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,Streaming,Shelf Number,Shelf Section,HDD Number,TMDB ID,Poster Path,Backdrop Path,Product Poster Path,Date Added,Purchase Date,Gift";

    private static async Task<JsonElement> ImportAsync(HttpClient client, string csv)
    {
        using var form = new MultipartFormDataContent { { new StringContent(csv), "file", "library.csv" } };
        var response = await client.PostAsync("/api/titles/import/csv", form);
        response.EnsureSuccessStatusCode();
        return await response.ReadJsonAsync();
    }

    private static Task<string> ExportAsync(HttpClient client) =>
        client.GetStringAsync("/api/titles/export/csv");

    [Fact]
    public async Task Shows_are_exported_and_imported_back_with_their_seasons()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        (await owner.PostAsJsonAsync("/api/tvshows", new
        {
            title = "The Wire",
            year = 2002,
            tmdbId = 1438,
            totalSeasons = 5,
            copies = new[]
            {
                new { seasons = new[] { 1, 2 }, upcNumber = "883929000001", formats = new[] { "DVD" }, condition = "Good", price = 19.99m, purchasedAt = "2020-01-01" },
                new { seasons = new[] { 3 }, upcNumber = "883929000002", formats = new[] { "Blu-ray" }, condition = "Good", price = 9.5m, purchasedAt = "2021-01-01" },
            },
        })).EnsureSuccessStatusCode();
        // TMDB numbers movies and shows separately: a movie with the same id is another title
        var movie = (Dictionary<string, object>)TestData.Movie("Fargo");
        movie["tmdbId"] = 1438;
        (await owner.PostAsJsonAsync("/api/movies", movie)).EnsureSuccessStatusCode();

        var exported = await ExportAsync(owner);
        var rows = exported.Split('\n', StringSplitOptions.RemoveEmptyEntries).Skip(1).ToList();
        Assert.StartsWith("\"Fargo\"", rows[0]); // Movies first
        Assert.EndsWith(",movie,,\"\"", rows[0].TrimEnd('\r'));
        Assert.EndsWith(",show,5,\"1|2\"", rows[1].TrimEnd('\r'));
        Assert.EndsWith(",show,5,\"3\"", rows[2].TrimEnd('\r'));

        var other = api.ClientFor(KinodexApiFactory.NewUserId());
        await ImportAsync(other, exported);

        var show = Assert.Single((await other.GetJsonAsync("/api/tvshows")).EnumerateArray());
        Assert.Equal(5, show.GetProperty("totalSeasons").GetInt32());
        var copies = show.GetProperty("copies").EnumerateArray().ToList();
        Assert.Equal([[1, 2], [3]], copies.Select(c => c.GetProperty("seasons").EnumerateArray().Select(s => s.GetInt32()).ToArray()));
        Assert.Equal(19.99m, copies[0].GetProperty("price").GetDecimal());
        Assert.Equal("Fargo", Assert.Single((await other.GetJsonAsync("/api/movies")).EnumerateArray()).GetProperty("title").GetString());

        // The same file again: every copy is already there
        var again = await ImportAsync(other, exported);
        Assert.Equal(3, again.GetProperty("skipped").GetInt32());
        Assert.Equal(2, Assert.Single((await other.GetJsonAsync("/api/tvshows")).EnumerateArray()).GetProperty("copies").GetArrayLength());
    }

    [Fact]
    public async Task A_box_sets_UPC_only_skips_a_row_for_the_film_that_already_has_it()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        const string setUpc = "5039036044776";
        var alien = (Dictionary<string, object>)TestData.Movie("Alien");
        alien["tmdbId"] = 348;
        alien["copies"] = new[] { new Dictionary<string, object>(TestData.Copy()) { ["upcNumber"] = setUpc } };
        (await owner.PostAsJsonAsync("/api/movies", alien)).EnsureSuccessStatusCode();

        var result = await ImportAsync(owner,
            OlderHeader + "\n" +
            $"\"Alien\",{setUpc},1979,\"Blu-ray\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,348,\"\",\"\",\"\",2024-03-10,2024-03-10,False\n" +
            $"\"Aliens\",{setUpc},1986,\"Blu-ray\",\"\",\"\",\"Good\",5,0,False,False,0,\"\",0,679,\"\",\"\",\"\",2024-03-10,2024-03-10,False\n");

        Assert.Equal(1, result.GetProperty("skipped").GetInt32());
        var movies = (await owner.GetJsonAsync("/api/movies")).EnumerateArray()
            .ToDictionary(m => m.GetProperty("title").GetString()!, m => m.GetProperty("copies").GetArrayLength());
        Assert.Equal(1, movies["Alien"]);
        Assert.Equal(1, movies["Aliens"]);
    }

    [Fact]
    public async Task A_show_row_with_a_season_past_the_last_is_reported_and_left_out()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());

        var result = await ImportAsync(owner,
            OlderHeader + ",Kind,Total Seasons,Seasons\n" +
            "\"Andor\",,2022,\"Blu-ray\",\"\",\"\",\"Good\",30,0,False,False,0,\"\",0,83867,\"\",\"\",\"\",2024-03-10,2024-03-10,False,show,2,\"1|3\"\n");

        Assert.Contains("past season 2", Assert.Single(result.GetProperty("errors").EnumerateArray()).GetString());
        Assert.Empty((await owner.GetJsonAsync("/api/tvshows")).EnumerateArray());
    }
}
