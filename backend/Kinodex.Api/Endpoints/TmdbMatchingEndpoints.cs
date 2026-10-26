using System.Security.Claims;
using Kinodex.Api.Services;

namespace Kinodex.Api.Endpoints;

public static class TmdbMatchingEndpoints
{
    public static void MapTmdbMatchingEndpoints(this IEndpointRouteBuilder app)
    {
        // Every route needs a signed-in user and only touches that user's movies
        var group = app.MapGroup("/api/tmdb").RequireAuthorization();

        // GET unmatched movies
        group.MapGet("/unmatched", async (ClaimsPrincipal user, TmdbMatchingService service) =>
        {
            var movies = await service.GetUnmatchedMovies(UserId(user));
            return Results.Ok(movies);
        });

        // POST - Run matching service and get suggestions
        group.MapPost("/match", async (ClaimsPrincipal user, TmdbMatchingService service) =>
        {
            var result = await service.MatchMoviesWithTmdb(UserId(user));
            return Results.Ok(result);
        });

        // POST - Assign TMDB ID to a movie
        group.MapPost("/assign", async (AssignTmdbRequest request, ClaimsPrincipal user, TmdbMatchingService service) =>
        {
            var success = await service.AssignTmdbId(UserId(user), request.MovieId, request.TmdbId, request.PosterPath, request.BackdropPath);
            return success ? Results.Ok() : Results.NotFound();
        });

        // POST - Fill missing poster/backdrop paths for already-matched movies
        group.MapPost("/fill-images", async (ClaimsPrincipal user, TmdbMatchingService service) =>
        {
            var result = await service.FillMissingImages(UserId(user));
            return Results.Ok(result);
        });

        // GET - Search TMDB for a specific title
        group.MapGet("/search", async (string title, int? year, TmdbMatchingService service) =>
        {
            var results = await service.SearchTmdb(title, year);
            return Results.Ok(results);
        });
    }

    private static string UserId(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
}

public record AssignTmdbRequest(int MovieId, int TmdbId, string? PosterPath = null, string? BackdropPath = null);