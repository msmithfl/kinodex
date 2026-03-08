using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class CollectionEndpoints
{
    public static void MapCollectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/collections").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.Collections
                .Where(c => c.UserId == userId)
                .OrderBy(c => c.Name)
                .ToListAsync();
        });

        group.MapPost("/", async (Collection collection, ClaimsPrincipal user, MovieDbContext db) =>
        {
            collection.UserId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            db.Collections.Add(collection);
            await db.SaveChangesAsync();
            return Results.Created($"/api/collections/{collection.Id}", collection);
        });

        group.MapPut("/{id}", async (int id, string newName, bool? isDirectorCollection, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var collection = await db.Collections.FindAsync(id);
            if (collection is null || collection.UserId != userId) return Results.NotFound();

            var oldName = collection.Name;
            collection.Name = newName;

            if (isDirectorCollection.HasValue)
                collection.IsDirectorCollection = isDirectorCollection.Value;

            // Update all movies that have this collection
            var moviesWithCollection = await db.Movies
                .Where(m => m.UserId == userId && m.Collections.Contains(oldName))
                .ToListAsync();

            foreach (var movie in moviesWithCollection)
            {
                var index = movie.Collections.IndexOf(oldName);
                if (index >= 0)
                    movie.Collections[index] = newName;
            }

            await db.SaveChangesAsync();
            return Results.Ok(collection);
        });

        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var collection = await db.Collections.FindAsync(id);
            if (collection is null || collection.UserId != userId) return Results.NotFound();

            var collectionName = collection.Name;

            // Remove this collection from all movies that have it
            var moviesWithCollection = await db.Movies
                .Where(m => m.UserId == userId && m.Collections.Contains(collectionName))
                .ToListAsync();

            foreach (var movie in moviesWithCollection)
                movie.Collections.Remove(collectionName);

            db.Collections.Remove(collection);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
