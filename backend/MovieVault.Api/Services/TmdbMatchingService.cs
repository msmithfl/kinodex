using System.Text.Json;
using MovieVault.Api.Data;
using MovieVault.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MovieVault.Api.Services;

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
        var url = $"https://api.themoviedb.org/3/search/movie?api_key={_apiKey}&query={Uri.EscapeDataString(title)}{yearParam}";

        try
        {
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

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
        catch
        {
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
