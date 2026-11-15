using System.Security.Claims;
using System.Security.Cryptography;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using Kinodex.Api.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using static Kinodex.Api.Services.JellyfinCompare;

namespace Kinodex.Api.Endpoints;

// The user's Jellyfin connection and the library comparison (docs/design/jellyfin-compare.md)
public static class JellyfinEndpoints
{
    // What the browser sees of a connection: never the key
    public record JellyfinStatus(
        bool Connected,
        string? ServerUrl,
        string? ServerName,
        string? ServerVersion,
        DateTime? ConnectedAt);

    public record JellyfinConnectRequest(string ServerUrl, string ApiKey);

    public record JellyfinComparison(LibraryComparison Movies, LibraryComparison Shows, DateTime ComparedAt);

    // One of the server's libraries, and whether it's compared. Type is Jellyfin's content type
    // ("movies", "tvshows", "homevideos", "musicvideos", or "" for mixed).
    public record JellyfinLibrary(string Id, string Name, string Type, bool Selected);

    public record JellyfinLibrarySelection(List<string> LibraryIds);

    // Update Streaming: for each title, the Jellyfin item it's on (Streaming on, linked) or null
    // (not on Jellyfin: Streaming off, unlinked). Titles left out are left as they are.
    public record StreamingChange(int Id, string? JellyfinItemId);
    public record JellyfinStreamingUpdate(List<StreamingChange> Movies, List<StreamingChange> Shows);
    public record JellyfinStreamingResult(int TurnedOn, int TurnedOff);

    private const string KeyPurpose = "Kinodex.Jellyfin.ApiKey";

    public static void MapJellyfinEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/jellyfin").RequireAuthorization();

        // GET the connection, if any
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var connection = await db.JellyfinConnections.FindAsync(UserId(user));
            return Results.Ok(StatusOf(connection));
        }).Produces<JellyfinStatus>();

        // PUT connect: checks the address and key against the server, then saves them
        group.MapPut("/", async (
            JellyfinConnectRequest request,
            ClaimsPrincipal user,
            MovieDbContext db,
            JellyfinClient jellyfin,
            IDataProtectionProvider protection,
            DataProtectionSecret secret,
            IHostEnvironment environment) =>
        {
            // Keys are only saved once the key ring is locked with a secret outside the database
            // (local development excepted)
            if (!secret.IsSet && !environment.IsDevelopment())
                return Results.Json(
                    new { error = $"Jellyfin connections aren't set up on this server ({DataProtectionSecret.SettingName}, {DataProtectionSecret.MinimumLength}+ characters)." },
                    statusCode: StatusCodes.Status503ServiceUnavailable);

            var allowPrivate = environment.IsDevelopment();
            if (!TryNormalizeUrl(request.ServerUrl, allowPrivate, out var serverUrl, out var urlError))
                return Results.BadRequest(new { error = urlError });
            var apiKey = request.ApiKey.Trim();
            if (apiKey.Length == 0)
                return Results.BadRequest(new { error = "Enter an API key from Jellyfin (Dashboard → API Keys)." });

            JellyfinClient.ServerInfo info;
            try
            {
                info = await jellyfin.GetServerInfoAsync(serverUrl, apiKey);
            }
            catch (JellyfinClient.JellyfinException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }

            var userId = UserId(user);
            var connection = await db.JellyfinConnections.FindAsync(userId);
            if (connection is null)
            {
                connection = new JellyfinConnection { UserId = userId };
                db.JellyfinConnections.Add(connection);
            }
            // A different server has different libraries and items, so the choice of libraries
            // starts over and the titles' Play links (to the old server's items) are forgotten
            if (connection.ServerUrl != serverUrl)
            {
                connection.LibraryIds = [];
                await ForgetLinksAsync(db, userId);
            }
            connection.ServerUrl = serverUrl;
            connection.ProtectedApiKey = protection.CreateProtector(KeyPurpose).Protect(apiKey);
            connection.ServerName = info.Name;
            connection.ServerVersion = info.Version;
            connection.ConnectedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(StatusOf(connection));
        }).Produces<JellyfinStatus>();

        // DELETE disconnect: forgets the address and key, and the titles' Play links (Streaming
        // itself is left as it is)
        group.MapDelete("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = UserId(user);
            var connection = await db.JellyfinConnections.FindAsync(userId);
            if (connection is not null)
            {
                db.JellyfinConnections.Remove(connection);
                await db.SaveChangesAsync();
                await ForgetLinksAsync(db, userId);
            }
            return Results.NoContent();
        });

        // GET the server's libraries that can hold movies or series, and which are compared
        group.MapGet("/libraries", async (
            ClaimsPrincipal user,
            MovieDbContext db,
            JellyfinClient jellyfin,
            IDataProtectionProvider protection) =>
        {
            var (connection, apiKey, problem) = await OpenAsync(UserId(user), db, protection);
            if (problem is not null) return problem;

            try
            {
                var libraries = await jellyfin.GetLibrariesAsync(connection!.ServerUrl, apiKey!);
                return Results.Ok(Describe(libraries, connection.LibraryIds));
            }
            catch (JellyfinClient.JellyfinException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status502BadGateway);
            }
        }).Produces<List<JellyfinLibrary>>();

        // PUT which libraries to compare (at least one)
        group.MapPut("/libraries", async (
            JellyfinLibrarySelection selection,
            ClaimsPrincipal user,
            MovieDbContext db,
            JellyfinClient jellyfin,
            IDataProtectionProvider protection) =>
        {
            var (connection, apiKey, problem) = await OpenAsync(UserId(user), db, protection);
            if (problem is not null) return problem;

            List<JellyfinClient.Library> libraries;
            try
            {
                libraries = await jellyfin.GetLibrariesAsync(connection!.ServerUrl, apiKey!);
            }
            catch (JellyfinClient.JellyfinException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status502BadGateway);
            }

            // Only the server's own libraries, in its order
            var chosen = libraries.Select(l => l.Id).Where(selection.LibraryIds.Contains).ToList();
            if (chosen.Count == 0)
                return Results.BadRequest(new { error = "Choose at least one library to compare." });

            // Every library chosen is the same as none chosen: all of them, new ones included
            connection.LibraryIds = chosen.Count == libraries.Count ? [] : chosen;
            await db.SaveChangesAsync();
            return Results.Ok(Describe(libraries, connection.LibraryIds));
        }).Produces<List<JellyfinLibrary>>();

        // GET compare: the Jellyfin libraries against the user's movies and TV shows
        group.MapGet("/compare", async (
            ClaimsPrincipal user,
            MovieDbContext db,
            JellyfinClient jellyfin,
            IDataProtectionProvider protection) =>
        {
            var userId = UserId(user);
            var (connection, apiKey, problem) = await OpenAsync(userId, db, protection);
            if (problem is not null) return problem;

            List<JellyfinClient.LibraryItem> items;
            try
            {
                items = await ReadChosenLibrariesAsync(jellyfin, connection!, apiKey!);
            }
            catch (JellyfinClient.JellyfinException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status502BadGateway);
            }

            var movies = await db.Movies
                .Where(m => m.UserId == userId)
                .Select(m => new KinodexTitle(m.Id, m.Title, m.Year, m.TmdbId, m.IsStreaming, m.JellyfinItemId))
                .ToListAsync();
            var shows = await db.TvShows
                .Where(s => s.UserId == userId)
                .Select(s => new KinodexTitle(s.Id, s.Title, s.Year, s.TmdbId, s.IsStreaming, s.JellyfinItemId))
                .ToListAsync();

            JellyfinTitle[] OfType(string type) => items
                .Where(i => i.Type.Equals(type, StringComparison.OrdinalIgnoreCase))
                .Select(i => new JellyfinTitle(i.Id, i.Title, i.Year, i.TmdbId))
                .ToArray();

            return Results.Ok(new JellyfinComparison(
                Compare(movies, OfType("Movie")),
                Compare(shows, OfType("Series")),
                DateTime.UtcNow));
        }).Produces<JellyfinComparison>();

        // POST Update Streaming: the changes the user confirmed on the page, worked out there from
        // the comparison. Only the user's own titles change; unknown ids are ignored.
        group.MapPost("/streaming", async (JellyfinStreamingUpdate update, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = UserId(user);
            if (await db.JellyfinConnections.FindAsync(userId) is null)
                return Results.Conflict(new { error = "Connect a Jellyfin server first." });
            if (update.Movies.Concat(update.Shows).Any(c => c.JellyfinItemId is { } id && !IsItemId(id)))
                return Results.BadRequest(new { error = "That isn't a Jellyfin item id." });

            var movieChanges = update.Movies.DistinctBy(c => c.Id).ToDictionary(c => c.Id, c => c.JellyfinItemId);
            var showChanges = update.Shows.DistinctBy(c => c.Id).ToDictionary(c => c.Id, c => c.JellyfinItemId);
            var movies = await db.Movies.Where(m => m.UserId == userId && movieChanges.Keys.Contains(m.Id)).ToListAsync();
            var shows = await db.TvShows.Where(s => s.UserId == userId && showChanges.Keys.Contains(s.Id)).ToListAsync();

            int turnedOn = 0, turnedOff = 0;
            void Count(bool was, bool now)
            {
                if (now && !was) turnedOn++;
                else if (!now && was) turnedOff++;
            }
            foreach (var movie in movies)
            {
                var itemId = movieChanges[movie.Id];
                Count(movie.IsStreaming, itemId is not null);
                movie.IsStreaming = itemId is not null;
                movie.JellyfinItemId = itemId;
            }
            foreach (var show in shows)
            {
                var itemId = showChanges[show.Id];
                Count(show.IsStreaming, itemId is not null);
                show.IsStreaming = itemId is not null;
                show.JellyfinItemId = itemId;
            }
            await db.SaveChangesAsync();

            return Results.Ok(new JellyfinStreamingResult(turnedOn, turnedOff));
        }).Produces<JellyfinStreamingResult>();
    }

    // Jellyfin's item ids are GUIDs (32 hex digits, or with dashes); they go into a link to the
    // server, so nothing else is taken
    private static bool IsItemId(string id) => Guid.TryParseExact(id, "N", out _) || Guid.TryParseExact(id, "D", out _);

    // Removes every Play link: they point at items on a server that's no longer the connected one
    private static async Task ForgetLinksAsync(MovieDbContext db, string userId)
    {
        await db.Movies.Where(m => m.UserId == userId && m.JellyfinItemId != null)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.JellyfinItemId, (string?)null));
        await db.TvShows.Where(s => s.UserId == userId && s.JellyfinItemId != null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.JellyfinItemId, (string?)null));
    }

    // The user's connection and its key, or the response to send when there's no usable one
    private static async Task<(JellyfinConnection? Connection, string? ApiKey, IResult? Problem)> OpenAsync(
        string userId, MovieDbContext db, IDataProtectionProvider protection)
    {
        var connection = await db.JellyfinConnections.FindAsync(userId);
        if (connection is null)
            return (null, null, Results.Conflict(new { error = "Connect a Jellyfin server first." }));
        try
        {
            return (connection, protection.CreateProtector(KeyPurpose).Unprotect(connection.ProtectedApiKey), null);
        }
        catch (CryptographicException)
        {
            return (null, null, Results.Conflict(new { error = "The saved API key can't be read any more. Connect again." }));
        }
    }

    // Every library, or only the chosen ones (those still on the server)
    private static async Task<List<JellyfinClient.LibraryItem>> ReadChosenLibrariesAsync(
        JellyfinClient jellyfin, JellyfinConnection connection, string apiKey)
    {
        if (connection.LibraryIds.Count == 0)
            return await jellyfin.GetLibraryAsync(connection.ServerUrl, apiKey);

        var onServer = (await jellyfin.GetLibrariesAsync(connection.ServerUrl, apiKey)).Select(l => l.Id).ToHashSet();
        var items = new List<JellyfinClient.LibraryItem>();
        foreach (var libraryId in connection.LibraryIds.Where(onServer.Contains))
            items.AddRange(await jellyfin.GetLibraryAsync(connection.ServerUrl, apiKey, libraryId));
        return items.DistinctBy(i => i.Id).ToList();
    }

    private static List<JellyfinLibrary> Describe(List<JellyfinClient.Library> libraries, List<string> chosen) =>
        libraries.Select(l => new JellyfinLibrary(l.Id, l.Name, l.Type, chosen.Count == 0 || chosen.Contains(l.Id))).ToList();

    private static string UserId(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Signed in without a user id.");

    private static JellyfinStatus StatusOf(JellyfinConnection? connection) => connection is null
        ? new JellyfinStatus(false, null, null, null, null)
        : new JellyfinStatus(true, connection.ServerUrl, connection.ServerName, connection.ServerVersion, connection.ConnectedAt);

    // The server's base address, e.g. "https://jellyfin.example.com" or ".../jellyfin" behind a
    // reverse proxy. https only, so the key isn't sent in the clear, except in local development
    // (a Jellyfin on the home network). A bare host name gets https:// added.
    internal static bool TryNormalizeUrl(string? input, bool allowHttp, out string url, out string error)
    {
        url = "";
        error = "Enter the server's address, e.g. https://jellyfin.example.com.";
        var text = input?.Trim() ?? "";
        if (text.Length == 0) return false;
        if (!text.Contains("://")) text = "https://" + text;

        if (!Uri.TryCreate(text, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("https" or "http") ||
            !string.IsNullOrEmpty(uri.UserInfo) ||
            !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment))
            return false;

        if (uri.Scheme == "http" && !allowHttp)
        {
            error = "Use the server's https address, so the API key isn't sent in the clear.";
            return false;
        }

        url = uri.GetLeftPart(UriPartial.Path).TrimEnd('/');
        return true;
    }
}
