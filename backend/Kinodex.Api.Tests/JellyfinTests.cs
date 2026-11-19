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
    public async Task The_keys_that_encrypt_api_keys_are_saved_locked_with_the_secret()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", [])))).EnsureSuccessStatusCode();

        var saved = await api.WithDbAsync(db => db.DataProtectionKeys.Select(k => k.Xml!).ToListAsync());
        Assert.NotEmpty(saved);
        Assert.All(saved, xml =>
        {
            Assert.Contains("encryptedSecret", xml);
            Assert.DoesNotContain("<masterKey", xml); // The plain form
        });

        // And still readable: the comparison decrypts the API key with them
        (await owner.GetAsync("/api/jellyfin/compare")).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Without_the_secret_connecting_is_turned_off()
    {
        await using var noSecret = api.WithWebHostBuilder(b => b.UseSetting(Kinodex.Api.Services.DataProtectionSecret.SettingName, ""));
        var client = noSecret.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, KinodexApiFactory.NewUserId());

        var response = await ConnectAsync(client, Add(new Server(Key, "Home Server", [])));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("DATA_PROTECTION_SECRET", (await response.ReadJsonAsync()).GetProperty("error").GetString());
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

    // Jellyfin's item ids are GUIDs, which Update Streaming checks for
    private const string AlienItem = "0a1b2c3d4e5f60718293a4b5c6d7e8f9";
    private const string WireItem = "1a1b2c3d4e5f60718293a4b5c6d7e8f9";

    [Fact]
    public async Task Update_streaming_turns_titles_on_and_off_and_saves_their_jellyfin_items()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);
        var clue = await AddMovieAsync(owner, "Clue", 1985, tmdbId: 15196, streaming: true);
        var thing = await AddMovieAsync(owner, "The Thing", 1982, tmdbId: 1091, streaming: true);
        var wire = await AddShowAsync(owner, "The Wire", 2002, tmdbId: 1438);
        var strangers = await AddMovieAsync(api.ClientFor(KinodexApiFactory.NewUserId()), "Alien", 1979, tmdbId: 348);
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", [])))).EnsureSuccessStatusCode();

        // Alien on Jellyfin, Clue not; The Thing (unticked on the page) left out
        var response = await owner.PostAsJsonAsync("/api/jellyfin/streaming", new
        {
            movies = new object[]
            {
                new { id = alien, jellyfinItemId = AlienItem },
                new { id = clue, jellyfinItemId = (string?)null },
                new { id = strangers, jellyfinItemId = AlienItem }, // Not theirs: ignored
            },
            shows = new[] { new { id = wire, jellyfinItemId = WireItem } },
        });
        response.EnsureSuccessStatusCode();
        var result = await response.ReadJsonAsync();
        Assert.Equal(2, result.GetProperty("turnedOn").GetInt32()); // Alien and The Wire
        Assert.Equal(1, result.GetProperty("turnedOff").GetInt32()); // Clue

        var movies = await api.WithDbAsync(db => db.Movies.Where(m => new[] { alien, clue, thing, strangers }.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => (m.IsStreaming, m.JellyfinItemId)));
        Assert.Equal((true, AlienItem), movies[alien]);
        Assert.Equal((false, null), movies[clue]);
        Assert.Equal((true, null), movies[thing]);
        Assert.Equal((false, null), movies[strangers]);
        var show = await owner.GetJsonAsync($"/api/tvshows/{wire}");
        Assert.True(show.GetProperty("isStreaming").GetBoolean());
        Assert.Equal(WireItem, show.GetProperty("jellyfinItemId").GetString());
    }

    [Fact]
    public async Task The_comparison_shows_each_titles_streaming_and_jellyfin_item()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", [new Item(AlienItem, "Alien", "Movie", 1979, 348)]))))
            .EnsureSuccessStatusCode();
        (await owner.PostAsJsonAsync("/api/jellyfin/streaming",
            new { movies = new[] { new { id = alien, jellyfinItemId = AlienItem } }, shows = Array.Empty<object>() }))
            .EnsureSuccessStatusCode();

        var match = Assert.Single((await owner.GetJsonAsync("/api/jellyfin/compare")).GetProperty("movies").GetProperty("inBoth").EnumerateArray());
        Assert.True(match.GetProperty("kinodex").GetProperty("isStreaming").GetBoolean());
        Assert.Equal(AlienItem, match.GetProperty("kinodex").GetProperty("jellyfinItemId").GetString());
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("{0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9}")]
    public async Task Update_streaming_refuses_anything_but_a_jellyfin_item_id(string itemId)
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", [])))).EnsureSuccessStatusCode();

        var response = await owner.PostAsJsonAsync("/api/jellyfin/streaming",
            new { movies = new[] { new { id = alien, jellyfinItemId = itemId } }, shows = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False((await owner.GetJsonAsync($"/api/movies/{alien}")).GetProperty("isStreaming").GetBoolean());
    }

    [Fact]
    public async Task Update_streaming_needs_a_connected_server()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);

        var response = await owner.PostAsJsonAsync("/api/jellyfin/streaming",
            new { movies = new[] { new { id = alien, jellyfinItemId = AlienItem } }, shows = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Changing_server_or_disconnecting_forgets_the_jellyfin_items_but_keeps_streaming()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);
        var wire = await AddShowAsync(owner, "The Wire", 2002, tmdbId: 1438);
        var link = new { movies = new[] { new { id = alien, jellyfinItemId = AlienItem } }, shows = new[] { new { id = wire, jellyfinItemId = WireItem } } };
        async Task<(JsonElement Movie, JsonElement Show)> ReadAsync() =>
            (await owner.GetJsonAsync($"/api/movies/{alien}"), await owner.GetJsonAsync($"/api/tvshows/{wire}"));

        var first = Add(new Server(Key, "First", []));
        (await ConnectAsync(owner, first)).EnsureSuccessStatusCode();
        (await owner.PostAsJsonAsync("/api/jellyfin/streaming", link)).EnsureSuccessStatusCode();

        // Connecting again to the same server (a new key) keeps them
        (await ConnectAsync(owner, first)).EnsureSuccessStatusCode();
        Assert.Equal(AlienItem, (await ReadAsync()).Movie.GetProperty("jellyfinItemId").GetString());

        (await ConnectAsync(owner, Add(new Server(Key, "Second", [])))).EnsureSuccessStatusCode();
        var (movie, show) = await ReadAsync();
        Assert.Equal(JsonValueKind.Null, movie.GetProperty("jellyfinItemId").ValueKind);
        Assert.Equal(JsonValueKind.Null, show.GetProperty("jellyfinItemId").ValueKind);
        Assert.True(movie.GetProperty("isStreaming").GetBoolean());

        (await owner.PostAsJsonAsync("/api/jellyfin/streaming", link)).EnsureSuccessStatusCode();
        (await owner.DeleteAsync("/api/jellyfin")).EnsureSuccessStatusCode();
        (movie, show) = await ReadAsync();
        Assert.Equal(JsonValueKind.Null, movie.GetProperty("jellyfinItemId").ValueKind);
        Assert.Equal(JsonValueKind.Null, show.GetProperty("jellyfinItemId").ValueKind);
        Assert.True(show.GetProperty("isStreaming").GetBoolean());
    }

    [Fact]
    public async Task A_new_title_is_never_linked_by_the_request_that_adds_it()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var body = (Dictionary<string, object>)TestData.Movie("Alien");
        body["jellyfinItemId"] = AlienItem;

        var created = await (await owner.PostAsJsonAsync("/api/movies", body)).ReadJsonAsync();

        Assert.Equal(JsonValueKind.Null, created.GetProperty("jellyfinItemId").ValueKind);
    }

    // Linking a title just added (the page asks after every add)

    private const string FellowshipItem = "2a1b2c3d4e5f60718293a4b5c6d7e8f9";
    private const string ClueItem = "3a1b2c3d4e5f60718293a4b5c6d7e8f9";

    private static Item[] Shelf(params Item[] items) =>
    [
        .. items,
        new Item("4a1b2c3d4e5f60718293a4b5c6d7e8f9", "Shrek", "Movie", 2001, 808),
        new Item("5a1b2c3d4e5f60718293a4b5c6d7e8f9", "Heat", "Movie", 1995, 949),
        new Item("6a1b2c3d4e5f60718293a4b5c6d7e8f9", "The Wire", "Movie", 2002), // A film, not the series
    ];

    private static async Task<JsonElement> LinkAsync(HttpClient client, string kind, int id)
    {
        var response = await client.PostAsync($"/api/jellyfin/{kind}/{id}/link", null);
        response.EnsureSuccessStatusCode();
        return await response.ReadJsonAsync();
    }

    [Fact]
    public async Task A_new_movie_on_jellyfin_is_linked_and_streaming_without_reading_the_whole_library()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        // Named differently on each side, so it's found among that year's films, by its TMDB id
        var fellowship = await AddMovieAsync(owner, "Lord of the Rings: The Fellowship of the Ring", 2001, tmdbId: 120);
        var url = Add(new Server(Key, "Home Server",
            Shelf(new Item(FellowshipItem, "The Lord of the Rings - The Fellowship of the Ring", "Movie", 2001, 120))));
        (await ConnectAsync(owner, url)).EnsureSuccessStatusCode();

        var result = await LinkAsync(owner, "movies", fellowship);

        Assert.Equal(FellowshipItem, result.GetProperty("jellyfinItemId").GetString());
        var movie = await owner.GetJsonAsync($"/api/movies/{fellowship}");
        Assert.Equal(FellowshipItem, movie.GetProperty("jellyfinItemId").GetString());
        Assert.True(movie.GetProperty("isStreaming").GetBoolean());
        // Only that year's films and a search, never the whole library
        Assert.All(RequestsTo(url).Where(r => r.StartsWith("/Items")), r => Assert.Matches("Years=|SearchTerm=", r));
    }

    [Fact]
    public async Task A_new_movie_without_a_year_is_found_by_its_title()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var clue = await AddMovieAsync(owner, "Clue", 0, tmdbId: null);
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", Shelf(new Item(ClueItem, "Clue", "Movie", 1985, 15196))))))
            .EnsureSuccessStatusCode();

        Assert.Equal(ClueItem, (await LinkAsync(owner, "movies", clue)).GetProperty("jellyfinItemId").GetString());
    }

    [Fact]
    public async Task A_new_show_is_linked_to_the_series_not_a_film_of_the_same_name()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var wire = await AddShowAsync(owner, "The Wire", 2002, tmdbId: 1438);
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", Shelf(new Item(WireItem, "The Wire", "Series", 2002, 1438))))))
            .EnsureSuccessStatusCode();

        Assert.Equal(WireItem, (await LinkAsync(owner, "shows", wire)).GetProperty("jellyfinItemId").GetString());
        Assert.True((await owner.GetJsonAsync($"/api/tvshows/{wire}")).GetProperty("isStreaming").GetBoolean());
    }

    [Fact]
    public async Task A_new_title_not_on_jellyfin_is_left_as_it_is()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348, streaming: true);
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server", Shelf())))).EnsureSuccessStatusCode();

        Assert.Equal(JsonValueKind.Null, (await LinkAsync(owner, "movies", alien)).GetProperty("jellyfinItemId").ValueKind);
        // Never turned off here: it may be streamed from somewhere else
        Assert.True((await owner.GetJsonAsync($"/api/movies/{alien}")).GetProperty("isStreaming").GetBoolean());
    }

    [Fact]
    public async Task A_new_title_is_only_looked_for_in_the_compared_libraries()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);
        Library[] libraries = [new Library("films", "Movies", "movies"), new Library("home", "Home videos", "homevideos")];
        (await ConnectAsync(owner, Add(new Server(Key, "Home Server",
            [new Item(AlienItem, "Alien", "Movie", 1979, 348, Library: "home")], Libraries: libraries)))).EnsureSuccessStatusCode();
        (await owner.PutAsJsonAsync("/api/jellyfin/libraries", new { libraryIds = new[] { "films" } })).EnsureSuccessStatusCode();

        Assert.Equal(JsonValueKind.Null, (await LinkAsync(owner, "movies", alien)).GetProperty("jellyfinItemId").ValueKind);
    }

    [Fact]
    public async Task Linking_needs_a_connected_server_and_the_users_own_title()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var alien = await AddMovieAsync(owner, "Alien", 1979, tmdbId: 348);

        Assert.Equal(HttpStatusCode.Conflict, (await owner.PostAsync($"/api/jellyfin/movies/{alien}/link", null)).StatusCode);

        var stranger = api.ClientFor(KinodexApiFactory.NewUserId());
        (await ConnectAsync(stranger, Add(new Server(Key, "Home Server", [new Item(AlienItem, "Alien", "Movie", 1979, 348)]))))
            .EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsync($"/api/jellyfin/movies/{alien}/link", null)).StatusCode);
    }

    private static IEnumerable<string> Titles(JsonElement list) =>
        list.EnumerateArray().Select(t => t.GetProperty("title").GetString()!);

    private static async Task<int> AddMovieAsync(HttpClient client, string title, int year, int? tmdbId, bool streaming = false)
    {
        var body = (Dictionary<string, object>)TestData.Movie(title);
        body["year"] = year;
        body["isStreaming"] = streaming;
        if (tmdbId is not null) body["tmdbId"] = tmdbId;
        var response = await client.PostAsJsonAsync("/api/movies", body);
        response.EnsureSuccessStatusCode();
        return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
    }

    private static async Task<int> AddShowAsync(HttpClient client, string title, int year, int tmdbId)
    {
        var response = await client.PostAsJsonAsync("/api/tvshows", new { title, year, tmdbId, purchases = Array.Empty<object>() });
        response.EnsureSuccessStatusCode();
        return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
    }
}
