using System.Text.Json;
using System.Text.Json.Serialization;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kinodex.Api.Services;

public class TmdbMatchingService
{
    private readonly MovieDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;

    public TmdbMatchingService(MovieDbContext db, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = configuration["TMDB_API_KEY"];
        
        // Log API key status (without revealing the key)
        if (string.IsNullOrEmpty(_apiKey))
        {
            Console.WriteLine("WARNING: TMDB_API_KEY is not configured!");
        }
        else
        {
            Console.WriteLine($"TMDB_API_KEY loaded: {_apiKey.Substring(0, Math.Min(4, _apiKey.Length))}...{_apiKey.Substring(Math.Max(0, _apiKey.Length - 4))}");
        }
    }

    public async Task<MatchingResult> MatchMoviesWithTmdb()
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            return new MatchingResult
            {
                Success = false,
                Message = "TMDB API key not configured. Please set TMDB_API_KEY in your environment variables or configuration."
            };
        }

        var unmatchedMovies = await _db.Movies
            .Where(m => m.TmdbId == null)
            .ToListAsync();

        var result = new MatchingResult
        {
            Success = true,
            TotalUnmatched = unmatchedMovies.Count
        };

        foreach (var movie in unmatchedMovies)
        {
            try
            {
                // Rate limiting - TMDB allows 50 requests per second, we'll be conservative
                await Task.Delay(250);

                var matches = await SearchTmdb(movie.Title, movie.Year);
                
                if (matches.Count > 0)
                {
                    var bestMatch = matches[0];
                    result.Suggestions.Add(new MatchSuggestion
                    {
                        MovieId = movie.Id,
                        MovieTitle = movie.Title,
                        MovieYear = movie.Year,
                        SuggestedMatches = matches
                    });
                }
                else
                {
                    result.NoMatchesFound++;
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Error matching '{movie.Title}': {ex.Message}");
            }
        }
        
        // Add specific message if all searches failed
        if (result.Suggestions.Count == 0 && unmatchedMovies.Count > 0 && result.NoMatchesFound == 0)
        {
            result.Success = false;
            result.Message = "All TMDB searches failed. This usually means the API key is invalid or not configured. Check server logs for details.";
        }
        else if (result.Suggestions.Count == 0 && result.NoMatchesFound > 0)
        {
            result.Message = $"No suggestions found. {result.NoMatchesFound} movies had no TMDB matches.";
        }
        
        if (!result.Success)
        {
            return result;
        }
        
        // Remove the duplicate else block below
        if (result.Suggestions.Count > 0)
        {
            result.Message = $"Found suggestions for {result.Suggestions.Count} of {unmatchedMovies.Count} unmatched movies.";
        }

        result.Message = $"Found suggestions for {result.Suggestions.Count} of {unmatchedMovies.Count} unmatched movies.";
        return result;
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

    public async Task<FillImagesResult> FillMissingImages()
    {
        if (string.IsNullOrEmpty(_apiKey))
            return new FillImagesResult { Success = false, Message = "TMDB API key not configured." };

        var movies = await _db.Movies
            .Where(m => m.TmdbId != null && (m.BackdropPath == null || m.BackdropPath == ""))
            .ToListAsync();

        var result = new FillImagesResult { Success = true, Total = movies.Count };

        foreach (var movie in movies)
        {
            try
            {
                await Task.Delay(250);

                var url = $"https://api.themoviedb.org/3/movie/{movie.TmdbId}";
                var request = new HttpRequestMessage(HttpMethod.Get, url);

                if (_apiKey.StartsWith("eyJ"))
                    request.Headers.Add("Authorization", $"Bearer {_apiKey}");
                else
                    request.RequestUri = new Uri(url + $"?api_key={_apiKey}");

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    result.Errors.Add($"Failed to fetch '{movie.Title}': {response.StatusCode}");
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync();
                var details = JsonSerializer.Deserialize<TmdbMovie>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (details != null)
                {
                    if (details.BackdropPath != null)
                        movie.BackdropPath = $"https://image.tmdb.org/t/p/w1280{details.BackdropPath}";
                    if (details.PosterPath != null && string.IsNullOrEmpty(movie.PosterPath))
                        movie.PosterPath = $"https://image.tmdb.org/t/p/w500{details.PosterPath}";
                    result.Updated++;
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Error processing '{movie.Title}': {ex.Message}");
            }
        }

        await _db.SaveChangesAsync();
        result.Message = $"Updated {result.Updated} of {result.Total} movies.";
        return result;
    }

    public async Task<bool> AssignTmdbId(int movieId, int tmdbId, string? posterPath = null, string? backdropPath = null)
    {
        var movie = await _db.Movies.FindAsync(movieId);
        if (movie == null) return false;

        movie.TmdbId = tmdbId;
        if (posterPath != null) movie.PosterPath = posterPath;
        if (backdropPath != null) movie.BackdropPath = backdropPath;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<Movie>> GetUnmatchedMovies()
    {
        return await _db.Movies
            .Where(m => m.TmdbId == null)
            .OrderBy(m => m.Title)
            .ToListAsync();
    }
}

public class FillImagesResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Updated { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class MatchingResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int TotalUnmatched { get; set; }
    public int NoMatchesFound { get; set; }
    public List<MatchSuggestion> Suggestions { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}

public class MatchSuggestion
{
    public int MovieId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public int MovieYear { get; set; }
    public List<TmdbSearchResult> SuggestedMatches { get; set; } = new();
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
