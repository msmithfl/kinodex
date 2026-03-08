using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;

namespace Kinodex.Api.Endpoints;

public static class CollectionEndpoints
{
    public static void MapCollectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/collections");

        group.MapGet("/", async (MovieDbContext db) =>
            await db.Collections.OrderBy(c => c.Name).ToListAsync());

        group.MapPost("/", async (Collection collection, MovieDbContext db) =>
        {
            db.Collections.Add(collection);
            await db.SaveChangesAsync();
            return Results.Created($"/api/collections/{collection.Id}", collection);
        });

        group.MapPut("/{id}", async (int id, string newName, bool? isDirectorCollection, MovieDbContext db) =>
        {
            var collection = await db.Collections.FindAsync(id);
            if (collection is null) return Results.NotFound();

            var oldName = collection.Name;
            collection.Name = newName;
            
            // Update IsDirectorCollection if provided
            if (isDirectorCollection.HasValue)
            {
                collection.IsDirectorCollection = isDirectorCollection.Value;
            }

            // Update all movies that have this collection
            var moviesWithCollection = await db.Movies
                .Where(m => m.Collections.Contains(oldName))
                .ToListAsync();

            foreach (var movie in moviesWithCollection)
            {
                var index = movie.Collections.IndexOf(oldName);
                if (index >= 0)
                {
                    movie.Collections[index] = newName;
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(collection);
        });

        group.MapDelete("/{id}", async (int id, MovieDbContext db) =>
        {
            var collection = await db.Collections.FindAsync(id);
            if (collection is null) return Results.NotFound();

            var collectionName = collection.Name;

            // Remove this collection from all movies that have it
            var moviesWithCollection = await db.Movies
                .Where(m => m.Collections.Contains(collectionName))
                .ToListAsync();

            foreach (var movie in moviesWithCollection)
            {
                movie.Collections.Remove(collectionName);
            }

            db.Collections.Remove(collection);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
