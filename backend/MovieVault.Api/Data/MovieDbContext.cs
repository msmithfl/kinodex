using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Models;


namespace MovieVault.Api.Data;

public class MovieDbContext : DbContext
{
    public MovieDbContext(DbContextOptions<MovieDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Movie> Movies => Set<Movie>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<ShelfSection> ShelfSections => Set<ShelfSection>();
    public DbSet<CollectionListItem> CollectionListItems => Set<CollectionListItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Checkout> Checkouts => Set<Checkout>();
    public DbSet<Product> Products => Set<Product>();
}
