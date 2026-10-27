using System.Net.Http.Json;
using System.Text.Json;

namespace Kinodex.Api.Tests.Infrastructure;

// Small helpers for creating data through the API and reading responses
public static class TestData
{
    // A valid movie body; the "userId" in it is deliberately someone else's, to prove the
    // server ignores it and uses the signed-in user. purchasedAt is left out unless given.
    public static object Movie(string title = "Alien", string[]? collections = null, string? purchasedAt = null)
    {
        var body = new Dictionary<string, object>
        {
            ["userId"] = "someone-else",
            ["title"] = title,
            ["upcNumber"] = "012345678905",
            ["condition"] = "Good",
            ["year"] = 1979,
            ["formats"] = new[] { "Blu-ray" },
            ["collections"] = collections ?? [],
            ["genres"] = new[] { "Horror" },
        };
        if (purchasedAt is not null) body["purchasedAt"] = purchasedAt;
        return body;
    }

    public static async Task<int> CreateMovieAsync(this HttpClient client, string title = "Alien", string[]? collections = null)
    {
        var response = await client.PostAsJsonAsync("/api/movies", Movie(title, collections));
        response.EnsureSuccessStatusCode();
        return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
    }

    public static async Task<int> CreateCollectionAsync(this HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/collections", new { name, isDirectorCollection = false });
        response.EnsureSuccessStatusCode();
        return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
    }

    public static async Task<JsonElement> ReadJsonAsync(this HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(text).RootElement.Clone();
    }

    public static async Task<JsonElement> GetJsonAsync(this HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.ReadJsonAsync();
    }
}
