using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Data;
using MovieVault.Api.Models;

namespace MovieVault.Api.Endpoints;

public static class CustomerEndpoints
{
    public static void MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/customers");

        // GET all customers
        group.MapGet("/", async (MovieDbContext db) =>
        {
            return await db.Customers
                .Include(c => c.Checkouts)
                .OrderBy(c => c.Name)
                .ToListAsync();
        });

        // GET customer by id
        group.MapGet("/{id}", async (int id, MovieDbContext db) =>
        {
            var customer = await db.Customers
                .Include(c => c.Checkouts)
                    .ThenInclude(ch => ch.Movie)
                .FirstOrDefaultAsync(c => c.Id == id);
                
            return customer is not null
                ? Results.Ok(customer)
                : Results.NotFound();
        });

        // POST create customer
        group.MapPost("/", async (Customer customer, MovieDbContext db) =>
        {
            db.Customers.Add(customer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/customers/{customer.Id}", customer);
        });

        // PUT update customer
        group.MapPut("/{id}", async (int id, Customer updatedCustomer, MovieDbContext db) =>
        {
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();

            customer.Name = updatedCustomer.Name;
            customer.Email = updatedCustomer.Email;
            customer.Phone = updatedCustomer.Phone;

            await db.SaveChangesAsync();
            return Results.Ok(customer);
        });

        // DELETE customer
        group.MapDelete("/{id}", async (int id, MovieDbContext db) =>
        {
            var customer = await db.Customers.FindAsync(id);
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
