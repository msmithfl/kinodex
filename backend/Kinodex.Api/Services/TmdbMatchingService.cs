using System.Text.Json;
using System.Text.Json.Serialization;

namespace Kinodex.Api.Services;

// TMDB movie search for the Letterboxd import, which matches each imported title to TMDB. (The
// app's own TMDB calls go through /api/tmdb/v3 instead; see Endpoints/TmdbEndpoints.cs.)
public class TmdbMatchingService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;

    public TmdbMatchingService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = configuration["TMDB_API_KEY"];
        if (string.IsNullOrEmpty(_apiKey))
        {
            Console.WriteLine("WARNING: TMDB_API_KEY is not configured!");
        }
    }

    public async Task<List<TmdbSearchResult>> SearchTmdb(string title, int? year = null)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            return new List<TmdbSearchResult>();
        }

        var yearParam = year.HasValue ? $"&year={year}" : "";
        var url = $"https://api.themoviedb.org/3/search/movie?query={Uri.EscapeDataString(title)}{yearParam}";

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            
            // Support both API Key and Bearer Token
            if (_apiKey.StartsWith("eyJ")) // JWT Bearer token
            {
                request.Headers.Add("Authorization", $"Bearer {_apiKey}");
            }
            else // API Key
            {
                url += $"&api_key={_apiKey}";
                request.RequestUri = new Uri(url);
            }
            
            var response = await _httpClient.SendAsync(request);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"TMDB API Error [{response.StatusCode}]: {errorContent}");
                
                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    Console.WriteLine("TMDB API returned 401 Unauthorized. Check your API key.");
                }
                
                return new List<TmdbSearchResult>();
            }

            var json = await response.Content.ReadAsStringAsync();
            var searchResponse = JsonSerializer.Deserialize<TmdbResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return searchResponse?.Results?
                .Select(r => new TmdbSearchResult
                {
                    TmdbId = r.Id,
                    Title = r.Title,
                    Year = r.ReleaseDate != null && DateTime.TryParse(r.ReleaseDate, out var date)
                        ? date.Year
                        : null,
                    PosterPath = r.PosterPath != null ? $"https://image.tmdb.org/t/p/w500{r.PosterPath}" : null,
                    BackdropPath = r.BackdropPath != null ? $"https://image.tmdb.org/t/p/w1280{r.BackdropPath}" : null,
                    Overview = r.Overview,
                    Genres = r.GenreIds
                        .Where(id => TmdbGenreMap.Map.ContainsKey(id))
                        .Select(id => TmdbGenreMap.Map[id])
                        .ToList()
                })
                .ToList() ?? new List<TmdbSearchResult>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception in TMDB search: {ex.Message}");
            return new List<TmdbSearchResult>();
        }
    }
}

public class TmdbSearchResult
{
    public int TmdbId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
    public string? Overview { get; set; }
    public List<string> Genres { get; set; } = new();
}

// Internal classes for JSON deserialization
internal class TmdbResponse
{
    public List<TmdbMovie>? Results { get; set; }
}

internal class TmdbMovie
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; set; }
    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; set; }
    [JsonPropertyName("backdrop_path")]
    public string? BackdropPath { get; set; }
    public string? Overview { get; set; }
    [JsonPropertyName("genre_ids")]
    public List<int> GenreIds { get; set; } = new();
}

internal static class TmdbGenreMap
{
    public static readonly Dictionary<int, string> Map = new()
    {
        { 28, "Action" }, { 12, "Adventure" }, { 16, "Animation" }, { 35, "Comedy" },
        { 80, "Crime" }, { 99, "Documentary" }, { 18, "Drama" }, { 10751, "Family" },
        { 14, "Fantasy" }, { 36, "History" }, { 27, "Horror" }, { 10402, "Music" },
        { 9648, "Mystery" }, { 10749, "Romance" }, { 878, "Sci-Fi" }, { 10770, "TV Movie" },
        { 53, "Thriller" }, { 10752, "War" }, { 37, "Western" }
    };
}
