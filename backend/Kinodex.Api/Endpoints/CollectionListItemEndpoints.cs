using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class CollectionListItemEndpoints
{
    public static void MapCollectionListItemEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/collections/{collectionId}/items").RequireAuthorization();

        // GET ALL: Get items for all collections (bulk endpoint)
        routes.MapGet("/api/collections/items/all", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            try
            {
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
                var items = await db.CollectionListItems
                    .Where(i => i.UserId == userId)
                    .OrderBy(i => i.CollectionId)
                    .ThenBy(i => i.Year)
                    .ThenBy(i => i.Title)
                    .ToListAsync();

                var grouped = items.GroupBy(i => i.CollectionId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                return Results.Ok(grouped);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching all collection items: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return Results.Ok(new Dictionary<int, List<CollectionListItem>>());
            }
        }).RequireAuthorization();

        // GET: Get all items for a collection
        group.MapGet("/", async (int collectionId, ClaimsPrincipal user, MovieDbContext db) =>
        {
            try
            {
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
                var items = await db.CollectionListItems
                    .Where(i => i.CollectionId == collectionId && i.UserId == userId)
                    .OrderBy(i => i.Year)
                    .ThenBy(i => i.Title)
                    .ToListAsync();

                return Results.Ok(items);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching items for collection {collectionId}: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return Results.Ok(new List<CollectionListItem>());
            }
        });

        // POST: Add a new item to collection list
        group.MapPost("/", async (int collectionId, CollectionListItem item, ClaimsPrincipal user, MovieDbContext db) =>
        {
            try
            {
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

                // Verify collection exists and belongs to user
                var collection = await db.Collections.FindAsync(collectionId);
                if (collection == null || collection.UserId != userId)
                    return Results.NotFound("Collection not found");

                item.CollectionId = collectionId;
                item.UserId = userId;
                item.CreatedAt = DateTime.UtcNow;

                db.CollectionListItems.Add(item);
                await db.SaveChangesAsync();

                return Results.Created($"/api/collections/{collectionId}/items/{item.Id}", item);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding item to collection {collectionId}: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return Results.Problem($"Error adding item: {ex.Message}", statusCode: 500);
            }
        });

        // DELETE: Remove an item from collection list
        group.MapDelete("/{itemId}", async (int collectionId, int itemId, ClaimsPrincipal user, MovieDbContext db) =>
        {
            try
            {
                var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
                var item = await db.CollectionListItems
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CollectionId == collectionId && i.UserId == userId);

                if (item == null)
                    return Results.NotFound();

                db.CollectionListItems.Remove(item);
                await db.SaveChangesAsync();

                return Results.NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting item {itemId} from collection {collectionId}: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return Results.Problem($"Error deleting item: {ex.Message}", statusCode: 500);
            }
        });
    }
}
