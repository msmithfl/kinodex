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

        group.MapPut("/{id}", async (int id, UpdateCollectionRequest request, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var collection = await db.Collections.FindAsync(id);
            if (collection is null || collection.UserId != userId) return Results.NotFound();

            var newName = request.Name.Trim();
            if (newName.Length == 0) return Results.BadRequest("A collection needs a name.");

            var oldName = collection.Name;
            collection.Name = newName;
            collection.IsDirectorCollection = request.IsDirectorCollection;
            collection.ImageUrl = request.ImageUrl;
            collection.BackdropUrl = request.BackdropUrl;

            // Update every title (movie or show) that has this collection
            var titlesWithCollection = await db.Titles
                .Where(m => m.UserId == userId && m.Collections.Contains(oldName))
                .ToListAsync();

            foreach (var title in titlesWithCollection)
            {
                var index = title.Collections.IndexOf(oldName);
                if (index >= 0)
                    title.Collections[index] = newName;
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

            // Remove this collection from every title (movie or show) that has it
            var titlesWithCollection = await db.Titles
                .Where(m => m.UserId == userId && m.Collections.Contains(collectionName))
                .ToListAsync();

            foreach (var title in titlesWithCollection)
                title.Collections.Remove(collectionName);

            db.Collections.Remove(collection);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

public record UpdateCollectionRequest(string Name, bool IsDirectorCollection, string? ImageUrl, string? BackdropUrl);
