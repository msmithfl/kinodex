using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Kinodex.Api.Services;

// The Jellyfin calls Kinodex makes (docs/design/jellyfin-compare.md), with an API key from the
// user's Jellyfin dashboard. Failures come back as a JellyfinException whose message can be shown
// to the user as it is.
public class JellyfinClient(HttpClient http)
{
    public record ServerInfo(string Name, string Version);

    // A movie or series from the libraries; TmdbId when Jellyfin has one for it
    public record LibraryItem(string Id, string Title, string Type, int Year, int? TmdbId);

    public class JellyfinException(string message) : Exception(message);

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // The server's name and version: also how connecting checks the address and key
    public async Task<ServerInfo> GetServerInfoAsync(string serverUrl, string apiKey, CancellationToken ct = default)
    {
        var info = await GetAsync<SystemInfoDto>(serverUrl, apiKey, "System/Info", ct);
        return new ServerInfo(info.ServerName ?? "Jellyfin", info.Version ?? "");
    }

    // Every movie and series across the server's libraries
    public async Task<List<LibraryItem>> GetLibraryAsync(string serverUrl, string apiKey, CancellationToken ct = default)
    {
        const string query = "Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds" +
                             "&EnableImages=false&EnableUserData=false&EnableTotalRecordCount=false";
        var result = await GetAsync<ItemsDto>(serverUrl, apiKey, query, ct);
        return (result.Items ?? [])
            .Where(i => !string.IsNullOrEmpty(i.Id) && !string.IsNullOrWhiteSpace(i.Name))
            .Select(i => new LibraryItem(i.Id!, i.Name!.Trim(), i.Type ?? "", i.ProductionYear ?? 0, TmdbIdOf(i)))
            .ToList();
    }

    private static int? TmdbIdOf(ItemDto item) =>
        item.ProviderIds?.FirstOrDefault(p => p.Key.Equals("Tmdb", StringComparison.OrdinalIgnoreCase)).Value
            is { } value && int.TryParse(value, out var id) && id > 0
            ? id
            : null;

    private async Task<T> GetAsync<T>(string serverUrl, string apiKey, string path, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{serverUrl}/{path}");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        // Jellyfin's API key header; the "Token=" part is required
        request.Headers.TryAddWithoutValidation("Authorization", $"MediaBrowser Token=\"{apiKey}\"");

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, ct);
        }
        catch (HttpRequestException ex) when (FindBlocked(ex) is not null)
        {
            throw new JellyfinException(
                "That address isn't allowed: Kinodex only connects to servers with a public internet address.");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new JellyfinException("Couldn't reach a Jellyfin server at that address.");
        }

        using (response)
        {
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw new JellyfinException("Jellyfin didn't accept that API key.");
            if (!response.IsSuccessStatusCode)
                throw new JellyfinException($"Jellyfin answered with an error ({(int)response.StatusCode}).");

            try
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                return JsonSerializer.Deserialize<T>(body, Json)
                    ?? throw new JellyfinException("That address didn't answer like a Jellyfin server.");
            }
            catch (JsonException)
            {
                throw new JellyfinException("That address didn't answer like a Jellyfin server.");
            }
        }
    }

    private static PublicAddress.BlockedException? FindBlocked(Exception? ex)
    {
        for (; ex is not null; ex = ex.InnerException)
            if (ex is PublicAddress.BlockedException blocked) return blocked;
        return null;
    }

    // Jellyfin's replies, only the parts used
    private record SystemInfoDto(string? ServerName, string? Version);
    private record ItemsDto(List<ItemDto>? Items);
    private record ItemDto(string? Id, string? Name, string? Type, int? ProductionYear, Dictionary<string, string>? ProviderIds);
}
