using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Kinodex.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using static Kinodex.Api.Tests.Infrastructure.FakeJellyfin;

namespace Kinodex.Api.Tests;

// Connecting a Jellyfin server and comparing its libraries with Kinodex, against stand-in servers
// (FakeJellyfin). The matching rules themselves are in JellyfinCompareTests.
[Collection(ApiCollection.Name)]
public class JellyfinTests(KinodexApiFactory api)
{
    private const string Key = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

    private static Task<HttpResponseMessage> ConnectAsync(HttpClient client, string serverUrl, string apiKey = Key) =>
        client.PutAsJsonAsync("/api/jellyfin", new { serverUrl, apiKey });

    [Fact]
    public async Task Connecting_checks_the_server_and_never_hands_back_the_key()
    {
        var userId = KinodexApiFactory.NewUserId();
        var owner = api.ClientFor(userId);
        var url = Add(new Server(Key, "Home Server", []));

        var connect = await ConnectAsync(owner, url + "/"); // A trailing slash is tidied away
        connect.EnsureSuccessStatusCode();
        var connectBody = await connect.Content.ReadAsStringAsync();
        Assert.DoesNotContain(Key, connectBody);

        var status = await owner.GetJsonAsync("/api/jellyfin");
        Assert.True(status.GetProperty("connected").GetBoolean());
        Assert.Equal(url, status.GetProperty("serverUrl").GetString());
        Assert.Equal("Home Server", status.GetProperty("serverName").GetString());
        Assert.DoesNotContain(Key, status.GetRawText());

        // Stored encrypted
        var stored = await api.WithDbAsync(db => db.JellyfinConnections.SingleAsync(c => c.UserId == userId));
        Assert.NotEqual(Key, stored.ProtectedApiKey);
        Assert.DoesNotContain(Key, stored.ProtectedApiKey);

        // Nobody else sees it
        var stranger = await api.ClientFor(KinodexApiFactory.NewUserId()).GetJsonAsync("/api/jellyfin");
        Assert.False(stranger.GetProperty("connected").GetBoolean());
    }

    [Fact]
    public async Task A_bare_host_name_gets_https()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var url = Add(new Server(Key, "Home Server", []));

        (await ConnectAsync(owner, url["https://".Length..])).EnsureSuccessStatusCode();

        Assert.Equal(url, (await owner.GetJsonAsync("/api/jellyfin")).GetProperty("serverUrl").GetString());
    }

    [Theory]
    [InlineData("wrong key", "didn't accept that API key")]
    [InlineData("unreachable", "Couldn't reach")]
    [InlineData("http", "https")]
    [InlineData("not a url", "Enter the server's address")]
    public async Task A_bad_key_or_address_is_refused_and_nothing_is_saved(string problem, string message)
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var url = Add(new Server(Key, "Home Server", []));
        var (serverUrl, apiKey) = problem switch
        {
            "wrong key" => (url, "not-the-key"),
            "unreachable" => ("https://nowhere.example.test", Key),
            "http" => (url.Replace("https://", "http://"), Key),
            _ => ("https://bad host/", Key),
        };

        var response = await ConnectAsync(owner, serverUrl, apiKey);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(message, (await response.ReadJsonAsync()).GetProperty("error").GetString());
        Assert.False((await owner.GetJsonAsync("/api/jellyfin")).GetProperty("connected").GetBoolean());
    }

    [Fact]
    public async Task Compare_sorts_titles_into_only_jellyfin_only_kinodex_and_both()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);
        await AddMovieAsync(owner, "The Thing", 1982, tmdbId: null); // No TMDB id: matched by title
        await AddMovieAsync(owner, "Clue", 1985, tmdbId: 15196);
        await AddShowAsync(owner, "The Wire", 2002, tmdbId: 1438);

        var url = Add(new Server(Key, "Home Server",
        [
            new Item("j1", "Alien", "Movie", 1979, 348),
            new Item("j2", "The Thing", "Movie", 1982, 1091),
            new Item("j3", "Blade Runner", "Movie", 1982, 78),
            new Item("j4", "The Wire", "Series", 2002, 1438),
            new Item("j5", "Lost", "Series", 2004, 4607),
            new Item("j6", "Alien Collection", "BoxSet", 0), // Not a movie or series: left out
        ]));
        (await ConnectAsync(owner, url)).EnsureSuccessStatusCode();

        var compare = await owner.GetJsonAsync("/api/jellyfin/compare");
        var movies = compare.GetProperty("movies");
        var shows = compare.GetProperty("shows");

        Assert.Equal(["Blade Runner"], Titles(movies.GetProperty("onlyOnJellyfin")));
        Assert.Equal(["Clue"], Titles(movies.GetProperty("onlyInKinodex")));
        var both = movies.GetProperty("inBoth").EnumerateArray()
            .ToDictionary(m => m.GetProperty("kinodex").GetProperty("title").GetString()!, m => m.GetProperty("matchedBy").GetString());
        Assert.Equal("tmdb", both["Alien"]);
        Assert.Equal("title", both["The Thing"]);

        Assert.Equal(["Lost"], Titles(shows.GetProperty("onlyOnJellyfin")));
        Assert.Empty(Titles(shows.GetProperty("onlyInKinodex")));
        Assert.Equal("tmdb", Assert.Single(shows.GetProperty("inBoth").EnumerateArray()).GetProperty("matchedBy").GetString());
    }

    [Fact]
    public async Task Compare_reads_the_whole_library_even_when_the_server_sends_less_than_asked()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        await AddMovieAsync(owner, "1941", 1979, tmdbId: 11519);

        // Seven movies from a server that sends three at a time; 1941 comes last
        var movies = Enumerable.Range(1, 6)
            .Select(n => new Item($"m{n}", $"Movie {n}", "Movie", 2000 + n, 1000 + n))
            .Append(new Item("m7", "1941", "Movie", 1979, 11519))
            .ToArray();
        var url = Add(new Server(Key, "Home Server", movies, MaxPerResponse: 3));
        (await ConnectAsync(owner, url)).EnsureSuccessStatusCode();

        var compare = (await owner.GetJsonAsync("/api/jellyfin/compare")).GetProperty("movies");

        Assert.Equal(7, compare.GetProperty("jellyfinCount").GetInt32());
        Assert.Equal(1, compare.GetProperty("kinodexCount").GetInt32());
        Assert.Empty(Titles(compare.GetProperty("onlyInKinodex")));
        Assert.Equal(6, compare.GetProperty("onlyOnJellyfin").GetArrayLength());
    }

    [Fact]
    public async Task Movies_in_a_jellyfin_collection_are_still_compared()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        await AddMovieAsync(owner, "1941", 1979, tmdbId: 11519);
        await AddMovieAsync(owner, "Jaws", 1975, tmdbId: 578);

        var url = Add(new Server(Key, "Home Server",
        [
            new Item("j1", "1941", "Movie", 1979, 11519, Collection: "Steven Spielberg"),
            new Item("j2", "Jaws", "Movie", 1975, 578, Collection: "Steven Spielberg"),
            new Item("j3", "Duel", "Movie", 1971, 839),
        ]));
        (await ConnectAsync(owner, url)).EnsureSuccessStatusCode();

        var movies = (await owner.GetJsonAsync("/api/jellyfin/compare")).GetProperty("movies");

        Assert.Equal(3, movies.GetProperty("jellyfinCount").GetInt32());
        Assert.Equal(2, movies.GetProperty("inBoth").GetArrayLength());
        Assert.Empty(Titles(movies.GetProperty("onlyInKinodex")));
        Assert.Equal(["Duel"], Titles(movies.GetProperty("onlyOnJellyfin")));
    }

    [Fact]
    public async Task Only_the_chosen_libraries_are_compared()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        await AddMovieAsync(owner, "Jaws", 1975, tmdbId: 578);

        var url = Add(new Server(Key, "Home Server",
            [
                new Item("j1", "Jaws", "Movie", 1975, 578, Library: "movies"),
                new Item("j2", "Duel", "Movie", 1971, 839, Library: "movies"),
                new Item("s1", "Lost", "Series", 2004, 4607, Library: "shows"),
                new Item("k1", "Skate Video", "Movie", 2010, null, Library: "sk8"),
            ],
            Libraries:
            [
                new Library("movies", "Movies", "movies"),
                new Library("shows", "TV Shows", "tvshows"),
                new Library("sk8", "Sk8 Videos", "homevideos"),
                new Library("sets", "Collections", "boxsets"), // Nothing to compare in it: not listed
            ]));
        (await ConnectAsync(owner, url)).EnsureSuccessStatusCode();

        // Every library to start with
        var libraries = await owner.GetJsonAsync("/api/jellyfin/libraries");
        Assert.Equal(["Movies", "TV Shows", "Sk8 Videos"], libraries.EnumerateArray().Select(l => l.GetProperty("name").GetString()));
        Assert.All(libraries.EnumerateArray(), l => Assert.True(l.GetProperty("selected").GetBoolean()));
        Assert.Equal(3, (await owner.GetJsonAsync("/api/jellyfin/compare")).GetProperty("movies").GetProperty("jellyfinCount").GetInt32());

        // Movies and TV Shows only
        var chosen = await owner.PutAsJsonAsync("/api/jellyfin/libraries", new { libraryIds = new[] { "movies", "shows" } });
        chosen.EnsureSuccessStatusCode();
        Assert.Equal(["movies", "shows"], (await chosen.ReadJsonAsync()).EnumerateArray()
            .Where(l => l.GetProperty("selected").GetBoolean()).Select(l => l.GetProperty("id").GetString()));

        var compare = await owner.GetJsonAsync("/api/jellyfin/compare");
        Assert.Equal(["Duel"], Titles(compare.GetProperty("movies").GetProperty("onlyOnJellyfin")));
        Assert.Equal(["Lost"], Titles(compare.GetProperty("shows").GetProperty("onlyOnJellyfin")));

        // None at all isn't a choice
        var none = await owner.PutAsJsonAsync("/api/jellyfin/libraries", new { libraryIds = Array.Empty<string>() });
        Assert.Equal(HttpStatusCode.BadRequest, none.StatusCode);
    }

    [Fact]
    public async Task Connecting_to_a_different_server_starts_the_library_choice_over()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        Library[] libraries = [new Library("a", "Movies", "movies"), new Library("b", "Shows", "tvshows")];
        (await ConnectAsync(owner, Add(new Server(Key, "First", [], Libraries: libraries)))).EnsureSuccessStatusCode();
        (await owner.PutAsJsonAsync("/api/jellyfin/libraries", new { libraryIds = new[] { "a" } })).EnsureSuccessStatusCode();

        (await ConnectAsync(owner, Add(new Server(Key, "Second", [], Libraries: libraries)))).EnsureSuccessStatusCode();

        Assert.All((await owner.GetJsonAsync("/api/jellyfin/libraries")).EnumerateArray(),
            l => Assert.True(l.GetProperty("selected").GetBoolean()));
    }

    [Fact]
    public async Task Disconnecting_forgets_the_server_and_compare_then_asks_to_connect()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", [])))).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync("/api/jellyfin")).StatusCode);

        Assert.False((await owner.GetJsonAsync("/api/jellyfin")).GetProperty("connected").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, (await owner.GetAsync("/api/jellyfin/compare")).StatusCode);
    }

    [Fact]
    public async Task Signed_out_requests_are_refused()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.ClientFor(null).GetAsync("/api/jellyfin")).StatusCode);
    }

    private static IEnumerable<string> Titles(JsonElement list) =>
        list.EnumerateArray().Select(t => t.GetProperty("title").GetString()!);

    private static async Task AddMovieAsync(HttpClient client, string title, int year, int? tmdbId)
    {
        var body = (Dictionary<string, object>)TestData.Movie(title);
        body["year"] = year;
        if (tmdbId is not null) body["tmdbId"] = tmdbId;
        (await client.PostAsJsonAsync("/api/movies", body)).EnsureSuccessStatusCode();
    }

    private static async Task AddShowAsync(HttpClient client, string title, int year, int tmdbId) =>
        (await client.PostAsJsonAsync("/api/tvshows", new { title, year, tmdbId, purchases = Array.Empty<object>() }))
            .EnsureSuccessStatusCode();
}
