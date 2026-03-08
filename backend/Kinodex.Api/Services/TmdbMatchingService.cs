using System.Text.Json;
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
                    PosterPath = r.PosterPath,
                    Overview = r.Overview
                })
                .ToList() ?? new List<TmdbSearchResult>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception in TMDB search: {ex.Message}");
            return new List<TmdbSearchResult>();
        }
    }

    public async Task<bool> AssignTmdbId(int movieId, int tmdbId)
    {
        var movie = await _db.Movies.FindAsync(movieId);
        if (movie == null) return false;

        movie.TmdbId = tmdbId;
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
    public string? Overview { get; set; }
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
    public string? ReleaseDate { get; set; }
    public string? PosterPath { get; set; }
    public string? Overview { get; set; }
}
