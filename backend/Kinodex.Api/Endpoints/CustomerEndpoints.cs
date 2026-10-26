using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;
using System.Security.Claims;

namespace Kinodex.Api.Endpoints;

public static class CustomerEndpoints
{
    public static void MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        // Every route is scoped to the signed-in user; the client never chooses the UserId
        var group = app.MapGroup("/api/customers").RequireAuthorization();

        // GET all customers
        group.MapGet("/", async (ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return await db.Customers
                .Where(c => c.UserId == userId)
                .Include(c => c.Checkouts)
                .OrderBy(c => c.Name)
                .ToListAsync();
        });

        // GET customer by id
        group.MapGet("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var customer = await db.Customers
                .Include(c => c.Checkouts)
                    .ThenInclude(ch => ch.Movie)
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

            return customer is not null
                ? Results.Ok(customer)
                : Results.NotFound();
        });

        // POST create customer
        group.MapPost("/", async (Customer customer, ClaimsPrincipal user, MovieDbContext db) =>
        {
            customer.Id = 0;
            customer.UserId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            db.Customers.Add(customer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/customers/{customer.Id}", customer);
        });

        // PUT update customer
        group.MapPut("/{id}", async (int id, Customer updatedCustomer, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
            if (customer is null) return Results.NotFound();

            customer.Name = updatedCustomer.Name;
            customer.Email = updatedCustomer.Email;
            customer.Phone = updatedCustomer.Phone;

            await db.SaveChangesAsync();
            return Results.Ok(customer);
        });

        // DELETE customer
        group.MapDelete("/{id}", async (int id, ClaimsPrincipal user, MovieDbContext db) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
            if (customer is null) return Results.NotFound();

            // Check if customer has active checkouts
            var hasActiveCheckouts = await db.Checkouts
                .AnyAsync(ch => ch.CustomerId == id && ch.ReturnedDate == null);

            if (hasActiveCheckouts)
            {
                return Results.BadRequest(new { message = "Cannot delete customer with active checkouts" });
            }

            db.Customers.Remove(customer);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
