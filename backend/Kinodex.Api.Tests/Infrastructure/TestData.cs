using System.Net.Http.Json;
using System.Text.Json;

namespace Kinodex.Api.Tests.Infrastructure;

// Small helpers for creating data through the API and reading responses
public static class TestData
{
    // A valid movie body with one copy (or the copies given); the "userId" in it is deliberately
    // someone else's, to prove the server ignores it and uses the signed-in user
    public static object Movie(string title = "Alien", string[]? collections = null, params object[] copies) =>
        new Dictionary<string, object>
        {
            ["userId"] = "someone-else",
            ["title"] = title,
            ["year"] = 1979,
            ["collections"] = collections ?? [],
            ["genres"] = new[] { "Horror" },
            ["copies"] = copies.Length > 0 ? copies : new[] { Copy() },
        };

    // A copy body; purchasedAt is left out unless given. id is the copy's when updating it.
    public static Dictionary<string, object> Copy(
        string format = "Blu-ray", string? purchasedAt = null, int? id = null, decimal price = 0, int hdd = 0)
    {
        var copy = new Dictionary<string, object>
        {
            ["upcNumber"] = "012345678905",
            ["condition"] = "Good",
            ["formats"] = new[] { format },
            ["price"] = price,
            ["hdDriveNumber"] = hdd,
        };
        if (purchasedAt is not null) copy["purchasedAt"] = purchasedAt;
        if (id is not null) copy["id"] = id;
        return copy;
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
