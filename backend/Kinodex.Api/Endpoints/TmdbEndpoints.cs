using System.Net.Http.Headers;
using System.Text.RegularExpressions;

namespace Kinodex.Api.Endpoints;

// TMDB (movie and TV data) through this server, so the TMDB key stays here instead of in the
// browser. The browser asks for /api/tmdb/v3/<TMDB path>?<query> and gets TMDB's reply as it is.
// The key comes from the TMDB_API_KEY setting: one key for everyone using this server (a
// self-hosted copy sets its own).
public static class TmdbEndpoints
{
    // The TMDB calls the app makes, and only those: searches, a title's images, a TV show's details
    private static readonly Regex AllowedPath = new(@"^(search/(movie|tv|person)|(movie|tv)/\d+/images|tv/\d+)$");

    public static void MapTmdbEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tmdb/v3/{**path}", async (
            string path,
            HttpContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration) =>
        {
            if (!AllowedPath.IsMatch(path))
                return Results.NotFound(new { message = "Not a TMDB request this app makes." });

            var key = configuration["TMDB_API_KEY"];
            if (string.IsNullOrWhiteSpace(key))
                return Results.Json(
                    new { message = "TMDB isn't set up on this server (TMDB_API_KEY)." },
                    statusCode: StatusCodes.Status503ServiceUnavailable);

            // TMDB takes either a read access token (a JWT, sent as a bearer token) or an older
            // API key (sent in the query)
            var isToken = key.StartsWith("eyJ");
            var query = context.Request.QueryString.Value ?? "";
            if (!isToken) query += (query.Length > 0 ? "&" : "?") + "api_key=" + Uri.EscapeDataString(key);

            using var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.themoviedb.org/3/{path}{query}");
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            if (isToken) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);

            try
            {
                var client = httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);
                using var response = await client.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();
                return Results.Content(body, "application/json", statusCode: (int)response.StatusCode);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                return Results.Json(
                    new { message = "Couldn't reach TMDB. Try again later." },
                    statusCode: StatusCodes.Status502BadGateway);
            }
        }).RequireAuthorization();
    }
}
