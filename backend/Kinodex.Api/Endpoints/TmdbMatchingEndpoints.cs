using Kinodex.Api.Services;

namespace Kinodex.Api.Endpoints;

public static class TmdbMatchingEndpoints
{
    public static void MapTmdbMatchingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tmdb");

        // GET unmatched movies
        group.MapGet("/unmatched", async (TmdbMatchingService service) =>
        {
            var movies = await service.GetUnmatchedMovies();
            return Results.Ok(movies);
        });

        // POST - Run matching service and get suggestions
        group.MapPost("/match", async (TmdbMatchingService service) =>
        {
            var result = await service.MatchMoviesWithTmdb();
            return Results.Ok(result);
        });

        // POST - Assign TMDB ID to a movie
        group.MapPost("/assign", async (AssignTmdbRequest request, TmdbMatchingService service) =>
        {
            var success = await service.AssignTmdbId(request.MovieId, request.TmdbId, request.PosterPath, request.BackdropPath);
            return success ? Results.Ok() : Results.NotFound();
        });

        // POST - Fill missing poster/backdrop paths for already-matched movies
        group.MapPost("/fill-images", async (TmdbMatchingService service) =>
        {
            var result = await service.FillMissingImages();
            return Results.Ok(result);
        });

        // GET - Search TMDB for a specific title
        group.MapGet("/search", async (string title, int? year, TmdbMatchingService service) =>
        {
            var results = await service.SearchTmdb(title, year);
            return Results.Ok(results);
        });
    }
}

public record AssignTmdbRequest(int MovieId, int TmdbId, string? PosterPath = null, string? BackdropPath = null);
