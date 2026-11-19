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

    // One of the server's libraries. Type is Jellyfin's content type: "movies", "tvshows",
    // "homevideos", "musicvideos", or "" for mixed content.
    public record Library(string Id, string Name, string Type);

    public class JellyfinException(string message) : Exception(message);

    // Library types that can't hold movies or series, so there's nothing in them to compare
    private static readonly HashSet<string> NotComparable =
        new(StringComparer.OrdinalIgnoreCase) { "boxsets", "playlists", "music", "books", "photos", "livetv" };

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // The server's name and version: also how connecting checks the address and key
    public async Task<ServerInfo> GetServerInfoAsync(string serverUrl, string apiKey, CancellationToken ct = default)
    {
        var info = await GetAsync<SystemInfoDto>(serverUrl, apiKey, "System/Info", ct);
        return new ServerInfo(info.ServerName ?? "Jellyfin", info.Version ?? "");
    }

    // The libraries that can hold movies or series, in the server's order
    public async Task<List<Library>> GetLibrariesAsync(string serverUrl, string apiKey, CancellationToken ct = default)
    {
        var folders = await GetAsync<List<VirtualFolderDto>>(serverUrl, apiKey, "Library/VirtualFolders", ct);
        return folders
            .Where(f => !string.IsNullOrEmpty(f.ItemId) && !NotComparable.Contains(f.CollectionType ?? ""))
            .Select(f => new Library(f.ItemId!, f.Name ?? "Library", f.CollectionType ?? ""))
            .ToList();
    }

    // How many items to ask for at a time. Asking for everything at once came back short on a real
    // server (1941 missing from a library of 1,536 movies), so the library is read in pages, in a
    // fixed order, until the server's own total is reached.
    private const int PageSize = 500;

    // The movies and series that could be this title: those from its year, give or take one (as
    // the matching allows), and those whose name contains its title. A small slice of the library
    // instead of all of it; the matching (JellyfinCompare) decides between them.
    public async Task<List<LibraryItem>> FindCandidatesAsync(
        string serverUrl, string apiKey, string title, int year, string? libraryId = null, CancellationToken ct = default)
    {
        var found = new List<LibraryItem>();
        if (year > 0)
            found.AddRange(await GetLibraryAsync(serverUrl, apiKey, libraryId, $"&Years={year - 1},{year},{year + 1}", ct));
        var searchTerm = LibraryTitle.WithoutArticle(title).Trim();
        if (searchTerm.Length > 0)
            found.AddRange(await GetLibraryAsync(serverUrl, apiKey, libraryId, $"&SearchTerm={Uri.EscapeDataString(searchTerm)}", ct));
        return found.DistinctBy(i => i.Id).ToList();
    }

    // Every movie and series across the server's libraries, or in one of them (libraryId), or only
    // those a filter picks out (more of the query, e.g. "&Years=1979")
    public async Task<List<LibraryItem>> GetLibraryAsync(
        string serverUrl, string apiKey, string? libraryId = null, string filter = "", CancellationToken ct = default)
    {
        var items = new Dictionary<string, LibraryItem>(); // By id, in case a page boundary repeats one
        var start = 0;
        for (var page = 0; page < 200; page++) // 100,000 items: a guard against a server that never ends
        {
            // CollapseBoxSetItems=false: asked without a user (as an API key asks), Jellyfin folds
            // every movie in a collection into the collection itself, so those movies never came
            // back (a third of a real library, 1941 among them; a search doesn't fold, so 1941 was
            // there when searched for)
            var query = "Items?Recursive=true&IncludeItemTypes=Movie,Series&CollapseBoxSetItems=false&Fields=ProviderIds" +
                        "&SortBy=SortName,ProductionYear,DateCreated&SortOrder=Ascending" +
                        $"&StartIndex={start}&Limit={PageSize}" +
                        (libraryId is null ? "" : $"&ParentId={Uri.EscapeDataString(libraryId)}") +
                        filter +
                        "&EnableImages=false&EnableUserData=false&EnableTotalRecordCount=true";
            var result = await GetAsync<ItemsDto>(serverUrl, apiKey, query, ct);
            var batch = result.Items ?? [];

            foreach (var i in batch.Where(i => !string.IsNullOrEmpty(i.Id) && !string.IsNullOrWhiteSpace(i.Name)))
                items[i.Id!] = new LibraryItem(i.Id!, i.Name!.Trim(), i.Type ?? "", i.ProductionYear ?? 0, TmdbIdOf(i));

            // Moves on by what actually came back, so a server that sends fewer than asked for
            // (a cap of its own) is still read to the end
            start += batch.Count;
            if (batch.Count == 0 || (result.TotalRecordCount is int total && start >= total)) break;
        }
        return items.Values.ToList();
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
    private record ItemsDto(List<ItemDto>? Items, int? TotalRecordCount);
    private record VirtualFolderDto(string? Name, string? CollectionType, string? ItemId);
    private record ItemDto(string? Id, string? Name, string? Type, int? ProductionYear, Dictionary<string, string>? ProviderIds);
}
