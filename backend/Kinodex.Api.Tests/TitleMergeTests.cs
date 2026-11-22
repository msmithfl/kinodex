using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Kinodex.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Tests;

// Merging duplicates (docs/design/titles-and-copies.md, step 4): POST /api/titles/merge
[Collection(ApiCollection.Name)]
public class TitleMergeTests(KinodexApiFactory api)
{
    private static async Task<JsonElement> AddMovieAsync(HttpClient client, Action<Dictionary<string, object>> edit, params object[] copies)
    {
        var body = (Dictionary<string, object>)TestData.Movie("Die Hard", null, copies);
        body["tmdbId"] = 562;
        edit(body);
        var response = await client.PostAsJsonAsync("/api/movies", body);
        response.EnsureSuccessStatusCode();
        return await response.ReadJsonAsync();
    }

    private static Task<HttpResponseMessage> MergeAsync(HttpClient client, params (int keep, int[] merge)[] groups) =>
        client.PostAsJsonAsync("/api/titles/merge", new { groups = groups.Select(g => new { keepId = g.keep, mergeIds = g.merge }) });

    [Fact]
    public async Task Merging_moves_every_copy_to_the_kept_movie_and_combines_their_details()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var vhs = await AddMovieAsync(owner, m =>
        {
            m["createdAt"] = "2020-01-01T00:00:00Z";
            m["collections"] = new[] { "Action" };
            m["review"] = "";
        }, TestData.Copy("VHS", "1995-01-01"));
        var bluRay = await AddMovieAsync(owner, m =>
        {
            m["createdAt"] = "2024-01-01T00:00:00Z";
            m["hasWatched"] = true;
            m["rating"] = 4.5;
            m["review"] = "Yippee";
            m["collections"] = new[] { "Christmas", "Action" };
            m["genres"] = new[] { "Thriller" };
        }, TestData.Copy("Blu-ray", "2024-01-01"), TestData.Copy("4K", "2024-06-01"));
        var keepId = vhs.GetProperty("id").GetInt32();
        var mergeId = bluRay.GetProperty("id").GetInt32();
        var movedCopyIds = bluRay.GetProperty("copies").EnumerateArray().Select(c => c.GetProperty("id").GetInt32()).ToList();

        var response = await MergeAsync(owner, (keepId, [mergeId]));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, (await response.ReadJsonAsync()).GetProperty("merged").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await owner.GetAsync($"/api/movies/{mergeId}")).StatusCode);

        var kept = await owner.GetJsonAsync($"/api/movies/{keepId}");
        var copies = kept.GetProperty("copies").EnumerateArray().ToList();
        Assert.Equal(["VHS", "Blu-ray", "4K"], copies.Select(c => c.GetProperty("formats")[0].GetString()));
        Assert.Equal(movedCopyIds, copies.Skip(1).Select(c => c.GetProperty("id").GetInt32())); // Same copies, same ids
        Assert.True(kept.GetProperty("hasWatched").GetBoolean());
        Assert.Equal(4.5f, kept.GetProperty("rating").GetSingle()); // The kept one had none
        Assert.Equal("Yippee", kept.GetProperty("review").GetString());
        Assert.Equal(["Action", "Christmas"], kept.GetProperty("collections").EnumerateArray().Select(c => c.GetString()));
        Assert.Equal(["Horror", "Thriller"], kept.GetProperty("genres").EnumerateArray().Select(g => g.GetString()));
        Assert.StartsWith("2020-01-01", kept.GetProperty("createdAt").GetString());
    }

    [Fact]
    public async Task The_kept_movies_own_rating_wins()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var keep = (await AddMovieAsync(owner, m => m["rating"] = 3)).GetProperty("id").GetInt32();
        var other = (await AddMovieAsync(owner, m => m["rating"] = 5)).GetProperty("id").GetInt32();

        (await MergeAsync(owner, (keep, [other]))).EnsureSuccessStatusCode();

        Assert.Equal(3f, (await owner.GetJsonAsync($"/api/movies/{keep}")).GetProperty("rating").GetSingle());
    }

    [Fact]
    public async Task Merging_shows_keeps_each_copys_seasons_and_the_largest_season_count()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        async Task<int> AddShowAsync(int totalSeasons, int[] seasons)
        {
            var response = await owner.PostAsJsonAsync("/api/tvshows", new { title = "The Wire", year = 2002, tmdbId = 1438, totalSeasons, copies = new[] { new { seasons } } });
            response.EnsureSuccessStatusCode();
            return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
        }
        var keep = await AddShowAsync(3, [1, 2, 3]);
        var other = await AddShowAsync(5, [4, 5]);

        (await MergeAsync(owner, (keep, [other]))).EnsureSuccessStatusCode();

        var show = await owner.GetJsonAsync($"/api/tvshows/{keep}");
        Assert.Equal(5, show.GetProperty("totalSeasons").GetInt32());
        Assert.Equal([[1, 2, 3], [4, 5]], show.GetProperty("copies").EnumerateArray()
            .Select(c => c.GetProperty("seasons").EnumerateArray().Select(s => s.GetInt32()).ToArray()));
        Assert.Single((await owner.GetJsonAsync("/api/tvshows")).EnumerateArray());
    }

    [Fact]
    public async Task Merging_needs_the_users_own_titles_of_one_kind_each_in_one_merge()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var a = (await AddMovieAsync(owner, _ => { })).GetProperty("id").GetInt32();
        var b = (await AddMovieAsync(owner, _ => { })).GetProperty("id").GetInt32();
        var c = (await AddMovieAsync(owner, _ => { })).GetProperty("id").GetInt32();
        var show = await owner.PostAsJsonAsync("/api/tvshows", new { title = "Die Hard", copies = Array.Empty<object>() });
        var showId = (await show.ReadJsonAsync()).GetProperty("id").GetInt32();
        var strangers = (await AddMovieAsync(api.ClientFor(KinodexApiFactory.NewUserId()), _ => { })).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NotFound, (await MergeAsync(owner, (a, [strangers]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await MergeAsync(owner, (a, [showId]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await MergeAsync(owner, (a, [b]), (c, [b]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await MergeAsync(owner, (a, [a]))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await MergeAsync(owner, (a, []))).StatusCode);
        // Malformed: no groups at all, or a group without its merge ids
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync("/api/titles/merge", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await owner.PostAsJsonAsync("/api/titles/merge", new { groups = new[] { new { keepId = a } } })).StatusCode);

        // Nothing was merged by any of them
        Assert.Equal(4, await api.WithDbAsync(db => db.Titles.CountAsync(t => t.Id == a || t.Id == b || t.Id == c || t.Id == showId)));
        Assert.True(await api.WithDbAsync(db => db.Movies.AnyAsync(m => m.Id == strangers)));
    }

    private static Task<HttpResponseMessage> MarkNotDuplicateAsync(HttpClient client, bool notDuplicate, params int[] ids) =>
        client.PutAsJsonAsync("/api/titles/not-duplicate", new { ids, notDuplicate });

    private static async Task<bool> IsNotDuplicateAsync(HttpClient client, int id) =>
        (await client.GetJsonAsync($"/api/movies/{id}")).GetProperty("notDuplicate").GetBoolean();

    [Fact]
    public async Task Entries_can_be_marked_not_a_duplicate_and_unmarked()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var a = (await AddMovieAsync(owner, _ => { })).GetProperty("id").GetInt32();
        var b = (await AddMovieAsync(owner, _ => { })).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NoContent, (await MarkNotDuplicateAsync(owner, true, a, b)).StatusCode);
        Assert.True(await IsNotDuplicateAsync(owner, a));
        Assert.True(await IsNotDuplicateAsync(owner, b));

        // Saving the movie leaves the mark alone, whatever the request says
        var movie = await owner.GetJsonAsync($"/api/movies/{a}");
        var body = JsonSerializer.Deserialize<Dictionary<string, object>>(movie.GetRawText())!;
        body["notDuplicate"] = false;
        (await owner.PutAsJsonAsync($"/api/movies/{a}", body)).EnsureSuccessStatusCode();
        Assert.True(await IsNotDuplicateAsync(owner, a));

        Assert.Equal(HttpStatusCode.NoContent, (await MarkNotDuplicateAsync(owner, false, a, b)).StatusCode);
        Assert.False(await IsNotDuplicateAsync(owner, a));
        Assert.False(await IsNotDuplicateAsync(owner, b));
    }

    [Fact]
    public async Task Only_the_users_own_titles_can_be_marked_and_a_new_one_starts_unmarked()
    {
        var owner = api.ClientFor(KinodexApiFactory.NewUserId());
        var mine = (await AddMovieAsync(owner, m => m["notDuplicate"] = true)).GetProperty("id").GetInt32();
        var strangers = (await AddMovieAsync(api.ClientFor(KinodexApiFactory.NewUserId()), _ => { })).GetProperty("id").GetInt32();

        Assert.False(await IsNotDuplicateAsync(owner, mine)); // Only Settings → Duplicates marks one
        Assert.Equal(HttpStatusCode.NotFound, (await MarkNotDuplicateAsync(owner, true, mine, strangers)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await MarkNotDuplicateAsync(owner, true)).StatusCode);

        // Nothing was marked, not even the user's own
        Assert.False(await IsNotDuplicateAsync(owner, mine));
        Assert.False(await api.WithDbAsync(db => db.Titles.Where(t => t.Id == strangers).Select(t => t.NotDuplicate).SingleAsync()));
    }
}
