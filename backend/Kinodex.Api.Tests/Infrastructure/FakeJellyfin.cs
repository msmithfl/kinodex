using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Kinodex.Api.Tests.Infrastructure;

// Stand-in Jellyfin servers for the tests. The test API's Jellyfin client talks to these instead
// of the network (KinodexApiFactory swaps in the handler). Each test adds its own server, under a
// host of its own, so tests never see each other's.
public static class FakeJellyfin
{
    // Collection: the box set it belongs to, if any. Library: the id of the library it's in.
    public record Item(string Id, string Name, string Type, int Year, int? TmdbId = null, string? Collection = null, string? Library = null);

    // CollectionType as Jellyfin names it: "movies", "tvshows", "boxsets", "homevideos", null (mixed), ...
    public record Library(string Id, string Name, string? CollectionType);

    // MaxPerResponse: send at most this many items per request whatever the request asks for, like
    // a server with a cap of its own
    public record Server(string ApiKey, string Name, Item[] Items, int? MaxPerResponse = null, Library[]? Libraries = null);

    private static readonly ConcurrentDictionary<string, Server> Servers = new();

    // Adds a server and returns its address
    public static string Add(Server server)
    {
        var host = $"jf{Guid.NewGuid():N}.example.test";
        Servers[host] = server;
        return $"https://{host}";
    }

    // The slice of the server's items a request asks for (StartIndex, Limit), within its cap
    private static IEnumerable<Item> Page(Server server, Uri uri)
    {
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        var start = int.TryParse(query["StartIndex"], out var s) ? s : 0;
        var limit = int.TryParse(query["Limit"], out var l) ? l : int.MaxValue;
        return Listed(server, query).Skip(start).Take(Math.Min(limit, server.MaxPerResponse ?? int.MaxValue));
    }

    // Like Jellyfin asked without a user: the movies in a collection come back as the collection
    // (one BoxSet item) unless CollapseBoxSetItems=false
    // (ParentId: only the items in that library)
    private static Item[] Listed(Server server, System.Collections.Specialized.NameValueCollection query)
    {
        var items = query["ParentId"] is { } parentId ? server.Items.Where(i => i.Library == parentId).ToArray() : server.Items;
        if (string.Equals(query["CollapseBoxSetItems"], "false", StringComparison.OrdinalIgnoreCase))
            return items;
        return items.Where(i => i.Collection is null)
            .Concat(items.Where(i => i.Collection is not null).Select(i => i.Collection!).Distinct()
                .Select(name => new Item($"boxset-{name}", name, "BoxSet", 0)))
            .ToArray();
    }

    public class Handler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (!Servers.TryGetValue(request.RequestUri!.Host, out var server))
                throw new HttpRequestException("No such host");

            var auth = request.Headers.TryGetValues("Authorization", out var values) ? values.First() : "";
            if (auth != $"MediaBrowser Token=\"{server.ApiKey}\"")
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized));

            object? body = request.RequestUri.AbsolutePath switch
            {
                "/System/Info" => new { ServerName = server.Name, Version = "10.10.7", Id = "abc" },
                "/Library/VirtualFolders" => (server.Libraries ?? [])
                    .Select(l => new { l.Name, l.CollectionType, ItemId = l.Id, Locations = Array.Empty<string>() })
                    .ToArray(),
                "/Items" => new
                {
                    Items = Page(server, request.RequestUri).Select(i => new
                    {
                        i.Id,
                        i.Name,
                        i.Type,
                        ProductionYear = i.Year,
                        ProviderIds = i.TmdbId is int tmdb
                            ? new Dictionary<string, string> { ["Tmdb"] = tmdb.ToString(), ["Imdb"] = "tt0000000" }
                            : new Dictionary<string, string>(),
                    }),
                    TotalRecordCount = Listed(server, System.Web.HttpUtility.ParseQueryString(request.RequestUri.Query)).Length,
                },
                _ => null,
            };

            return Task.FromResult(body is null
                ? new HttpResponseMessage(HttpStatusCode.NotFound)
                : new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
                });
        }
    }
}
