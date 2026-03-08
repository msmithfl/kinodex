using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Data;
using MovieVault.Api.Models;
using System.Security.Claims;
using System.Text;

namespace MovieVault.Api.Endpoints;

public static class MovieEndpoints
{
    public static void MapMovieEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/movies");

        // GET all movies
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.Movies
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }).RequireAuthorization();

        // GET movie by id
        group.MapGet("/{id}", async (int id, MovieDbContext db) =>
        {
            return await db.Movies.FindAsync(id) is Movie movie
                ? Results.Ok(movie)
                : Results.NotFound();
        });

        // POST create movie
        group.MapPost("/", async (Movie movie, MovieDbContext db) =>
        {
            db.Movies.Add(movie);
            await db.SaveChangesAsync();
            return Results.Created($"/api/movies/{movie.Id}", movie);
        });

        // PUT update movie
        group.MapPut("/{id}", async (int id, Movie updatedMovie, MovieDbContext db) =>
        {
            var movie = await db.Movies.FindAsync(id);
            if (movie is null) return Results.NotFound();

            movie.UserId = updatedMovie.UserId;
            movie.Title = updatedMovie.Title;
            movie.UpcNumber = updatedMovie.UpcNumber;
            movie.Formats = updatedMovie.Formats;
            movie.Collections = updatedMovie.Collections;
            movie.Condition = updatedMovie.Condition;
            movie.PurchasePrice = updatedMovie.PurchasePrice;
            movie.HasWatched = updatedMovie.HasWatched;
            movie.Rating = updatedMovie.Rating;
            movie.Review = updatedMovie.Review;
            movie.Year = updatedMovie.Year;
            movie.Genres = updatedMovie.Genres;
            movie.PosterPath = updatedMovie.PosterPath;
            movie.ProductPosterPath = updatedMovie.ProductPosterPath;
            movie.TmdbId = updatedMovie.TmdbId;
            movie.HDDriveNumber = updatedMovie.HDDriveNumber;
            movie.ShelfNumber = updatedMovie.ShelfNumber;
            movie.ShelfSection = updatedMovie.ShelfSection;
            movie.IsOnPlex = updatedMovie.IsOnPlex;

            await db.SaveChangesAsync();
            return Results.Ok(movie);
        });

        // DELETE movie
        group.MapDelete("/{id}", async (int id, MovieDbContext db) =>
        {
            var movie = await db.Movies.FindAsync(id);
            if (movie is null) return Results.NotFound();

            db.Movies.Remove(movie);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // GET export movies as CSV
        group.MapGet("/export/csv", async (MovieDbContext db) =>
        {
            var movies = await db.Movies.OrderBy(m => m.Title).ToListAsync();

            var csv = new StringBuilder();
            csv.AppendLine("Title,UPC,Year,Formats,Genres,Collections,Condition,Purchase Price,Rating,Watched,On Plex,Shelf Number,Shelf Section,HDD Number,TMDB ID,Date Added");

            foreach (var movie in movies)
            {
                var formats = string.Join("|", movie.Formats);
                var genres = string.Join("|", movie.Genres);
                var collections = string.Join("|", movie.Collections);
                csv.AppendLine($"\"{movie.Title.Replace("\"", "\"\"")}\",{movie.UpcNumber},{movie.Year},\"{formats}\",\"{genres}\",\"{collections}\",{movie.Condition},{movie.PurchasePrice},{movie.Rating},{movie.HasWatched},{movie.IsOnPlex},{movie.ShelfNumber},{movie.ShelfSection},{movie.HDDriveNumber},{movie.TmdbId},{movie.CreatedAt:yyyy-MM-dd}");
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            return Results.File(bytes, "text/csv", "movie-vault-export.csv");
        });
    }
}
