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
    public record Item(string Id, string Name, string Type, int Year, int? TmdbId = null);

    public record Server(string ApiKey, string Name, Item[] Items);

    private static readonly ConcurrentDictionary<string, Server> Servers = new();

    // Adds a server and returns its address
    public static string Add(Server server)
    {
        var host = $"jf{Guid.NewGuid():N}.example.test";
        Servers[host] = server;
        return $"https://{host}";
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
                "/Items" => new
                {
                    Items = server.Items.Select(i => new
                    {
                        i.Id,
                        i.Name,
                        i.Type,
                        ProductionYear = i.Year,
                        ProviderIds = i.TmdbId is int tmdb
                            ? new Dictionary<string, string> { ["Tmdb"] = tmdb.ToString(), ["Imdb"] = "tt0000000" }
                            : new Dictionary<string, string>(),
                    }),
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
