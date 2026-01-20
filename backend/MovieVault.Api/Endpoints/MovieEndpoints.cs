using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Data;
using MovieVault.Api.Models;

namespace MovieVault.Api.Endpoints;

public static class MovieEndpoints
{
    public static void MapMovieEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/movies");

        // GET all movies
        group.MapGet("/", async (MovieDbContext db) =>
        {
            return await db.Movies.OrderByDescending(m => m.CreatedAt).ToListAsync();
        });

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

            movie.Title = updatedMovie.Title;
            movie.UpcNumber = updatedMovie.UpcNumber;
            movie.Formats = updatedMovie.Formats;
            movie.Collections = updatedMovie.Collections;
            movie.Condition = updatedMovie.Condition;
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
    }
}
