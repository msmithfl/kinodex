using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class ShelfSectionEndpoints
{
    public static void MapShelfSectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shelfsections");

        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.ShelfSections
                .Where(s => s.UserId == userId)
                .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.Name)
                .ToListAsync();
        }).RequireAuthorization();

        group.MapPost("/", async (ShelfSection section, ClaimsPrincipal user, MovieDbContext db) =>
        {
            section.UserId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var maxOrder = await db.ShelfSections
                .Where(s => s.UserId == section.UserId)
                .Select(s => (int?)s.SortOrder)
                .MaxAsync() ?? -1;
            section.SortOrder = maxOrder + 1;
            db.ShelfSections.Add(section);
            await db.SaveChangesAsync();
            return Results.Created($"/api/shelfsections/{section.Id}", section);
        }).RequireAuthorization();
    }
}
