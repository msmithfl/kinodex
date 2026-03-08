using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;

namespace Kinodex.Api.Endpoints;

public static class CheckoutEndpoints
{
    public static void MapCheckoutEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/checkouts");

        // GET all checkouts
        group.MapGet("/", async (MovieDbContext db, bool? activeOnly) =>
        {
            var query = db.Checkouts
                .Include(ch => ch.Movie)
                .Include(ch => ch.Customer)
                .AsQueryable();

            if (activeOnly == true)
            {
                query = query.Where(ch => ch.ReturnedDate == null);
            }

            return await query
                .OrderByDescending(ch => ch.CheckedOutDate)
                .ToListAsync();
        });

        // GET checkout by id
        group.MapGet("/{id}", async (int id, MovieDbContext db) =>
        {
            var checkout = await db.Checkouts
                .Include(ch => ch.Movie)
                .Include(ch => ch.Customer)
                .FirstOrDefaultAsync(ch => ch.Id == id);
                
            return checkout is not null
                ? Results.Ok(checkout)
                : Results.NotFound();
        });

        // GET checkouts by movie
        group.MapGet("/movie/{movieId}", async (int movieId, MovieDbContext db) =>
        {
            return await db.Checkouts
                .Include(ch => ch.Customer)
                .Where(ch => ch.MovieId == movieId)
                .OrderByDescending(ch => ch.CheckedOutDate)
                .ToListAsync();
        });

        // GET checkouts by customer
        group.MapGet("/customer/{customerId}", async (int customerId, MovieDbContext db) =>
        {
            return await db.Checkouts
                .Include(ch => ch.Movie)
                .Where(ch => ch.CustomerId == customerId)
                .OrderByDescending(ch => ch.CheckedOutDate)
                .ToListAsync();
        });

        // GET overdue checkouts
        group.MapGet("/overdue", async (MovieDbContext db) =>
        {
            var now = DateTime.UtcNow;
            return await db.Checkouts
                .Include(ch => ch.Movie)
                .Include(ch => ch.Customer)
                .Where(ch => ch.ReturnedDate == null && ch.DueDate != null && ch.DueDate < now)
                .OrderBy(ch => ch.DueDate)
                .ToListAsync();
        });

        // POST create checkout
        group.MapPost("/", async (Checkout checkout, MovieDbContext db) =>
        {
            // Check if movie is already checked out
            var existingCheckout = await db.Checkouts
                .FirstOrDefaultAsync(ch => ch.MovieId == checkout.MovieId && ch.ReturnedDate == null);
            
            if (existingCheckout is not null)
            {
                return Results.BadRequest(new { message = "This movie is already checked out" });
            }

            // Verify movie and customer exist
            var movie = await db.Movies.FindAsync(checkout.MovieId);
            var customer = await db.Customers.FindAsync(checkout.CustomerId);
            
            if (movie is null) return Results.BadRequest(new { message = "Movie not found" });
            if (customer is null) return Results.BadRequest(new { message = "Customer not found" });

            // Ensure all dates are UTC for PostgreSQL
            checkout.CheckedOutDate = DateTime.SpecifyKind(checkout.CheckedOutDate, DateTimeKind.Utc);
            if (checkout.DueDate.HasValue)
            {
                checkout.DueDate = DateTime.SpecifyKind(checkout.DueDate.Value, DateTimeKind.Utc);
            }

            db.Checkouts.Add(checkout);
            await db.SaveChangesAsync();
            
            // Reload with navigation properties
            await db.Entry(checkout).Reference(c => c.Movie).LoadAsync();
            await db.Entry(checkout).Reference(c => c.Customer).LoadAsync();
            
            return Results.Created($"/api/checkouts/{checkout.Id}", checkout);
        });

        // PUT update checkout
        group.MapPut("/{id}", async (int id, Checkout updatedCheckout, MovieDbContext db) =>
        {
            var checkout = await db.Checkouts.FindAsync(id);
            if (checkout is null) return Results.NotFound();

            // Ensure dates are UTC for PostgreSQL
            if (updatedCheckout.DueDate.HasValue)
            {
                checkout.DueDate = DateTime.SpecifyKind(updatedCheckout.DueDate.Value, DateTimeKind.Utc);
            }
            else
            {
                checkout.DueDate = null;
            }
            
            if (updatedCheckout.ReturnedDate.HasValue)
            {
                checkout.ReturnedDate = DateTime.SpecifyKind(updatedCheckout.ReturnedDate.Value, DateTimeKind.Utc);
            }
            else
            {
                checkout.ReturnedDate = null;
            }
            
            checkout.Notes = updatedCheckout.Notes;

            await db.SaveChangesAsync();
            
            // Reload with navigation properties
            await db.Entry(checkout).Reference(c => c.Movie).LoadAsync();
            await db.Entry(checkout).Reference(c => c.Customer).LoadAsync();
            
            return Results.Ok(checkout);
        });

        // POST return movie
        group.MapPost("/{id}/return", async (int id, MovieDbContext db) =>
        {
            var checkout = await db.Checkouts
                .Include(ch => ch.Movie)
                .Include(ch => ch.Customer)
                .FirstOrDefaultAsync(ch => ch.Id == id);
                
            if (checkout is null) return Results.NotFound();
            
            if (checkout.ReturnedDate is not null)
            {
                return Results.BadRequest(new { message = "Movie has already been returned" });
            }

            checkout.ReturnedDate = DateTime.UtcNow;
            await db.SaveChangesAsync();
            
            return Results.Ok(checkout);
        });

        // DELETE checkout
        group.MapDelete("/{id}", async (int id, MovieDbContext db) =>
        {
            var checkout = await db.Checkouts.FindAsync(id);
            if (checkout is null) return Results.NotFound();

            db.Checkouts.Remove(checkout);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
