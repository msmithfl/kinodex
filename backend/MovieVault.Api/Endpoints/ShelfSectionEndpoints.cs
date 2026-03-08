using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Data;
using MovieVault.Api.Models;
using System.Security.Claims;

namespace MovieVault.Api.Endpoints;

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
                .OrderBy(s => s.Name)
                .ToListAsync();
        }).RequireAuthorization();

        group.MapPost("/", async (ShelfSection section, ClaimsPrincipal user, MovieDbContext db) =>
        {
            section.UserId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            db.ShelfSections.Add(section);
            await db.SaveChangesAsync();
            return Results.Created($"/api/shelfsections/{section.Id}", section);
        }).RequireAuthorization();

        group.MapPut("/{id}", async (int id, string newName, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var section = await db.ShelfSections.FindAsync(id);
            if (section is null || section.UserId != userId) return Results.NotFound();

            var oldName = section.Name;
            section.Name = newName;

            // Update all movies that have this shelf section
            var moviesWithSection = await db.Movies
                .Where(m => m.UserId == userId && m.ShelfSection == oldName)
                .ToListAsync();

            foreach (var movie in moviesWithSection)
            {
                movie.ShelfSection = newName;
            }

            await db.SaveChangesAsync();
            return Results.Ok(section);
        }).RequireAuthorization();

        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var section = await db.ShelfSections.FindAsync(id);
            if (section is null || section.UserId != userId) return Results.NotFound();

            var sectionName = section.Name;

            // Remove this shelf section from all movies that have it
            var moviesWithSection = await db.Movies
                .Where(m => m.UserId == userId && m.ShelfSection == sectionName)
                .ToListAsync();

            foreach (var movie in moviesWithSection)
            {
                movie.ShelfSection = string.Empty;
            }

            db.ShelfSections.Remove(section);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }
}
