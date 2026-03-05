using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Data;
using MovieVault.Api.Models;

namespace MovieVault.Api.Endpoints;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/products");

        // GET product by UPC
        group.MapGet("/{upc}", async (string upc, MovieDbContext db) =>
        {
            var product = await db.Products.FindAsync(upc);
            return product is not null
                ? Results.Ok(product)
                : Results.NotFound();
        });

        // POST create or update product
        group.MapPost("/", async (Product product, MovieDbContext db) =>
        {
            var existing = await db.Products.FindAsync(product.Upc);
            if (existing is null)
            {
                db.Products.Add(product);
            }
            else
            {
                existing.EbayAveragePrice = product.EbayAveragePrice;
                existing.EbayPriceCount = product.EbayPriceCount;
                existing.EbayCachedAt = product.EbayCachedAt;
            }
            await db.SaveChangesAsync();
            return Results.Ok(product);
        });
    }
}