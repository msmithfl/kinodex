using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Models;


namespace Kinodex.Api.Data;

// IDataProtectionKeyContext: Data Protection keeps its keys here (DataProtectionKeys), so what it
// encrypted (Jellyfin API keys) can still be read after a redeploy
public class MovieDbContext : DbContext, IDataProtectionKeyContext
{
    public MovieDbContext(DbContextOptions<MovieDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    // Movies and TV shows together (one Titles table); Movies and TvShows each read one kind
    public DbSet<CatalogTitle> Titles => Set<CatalogTitle>();
    public DbSet<Movie> Movies => Set<Movie>();
    public DbSet<TvShow> TvShows => Set<TvShow>();
    public DbSet<Copy> Copies => Set<Copy>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<ShelfSection> ShelfSections => Set<ShelfSection>();
    public DbSet<CollectionListItem> CollectionListItems => Set<CollectionListItem>();
    public DbSet<UpcLookup> UpcLookups => Set<UpcLookup>();
    public DbSet<MoviePreset> MoviePresets => Set<MoviePreset>();
    public DbSet<JellyfinConnection> JellyfinConnections => Set<JellyfinConnection>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MoviePreset>().HasIndex(p => new { p.UserId, p.Name }).IsUnique();

        modelBuilder.Entity<CatalogTitle>(title =>
        {
            title.ToTable("Titles");
            title.HasDiscriminator<string>("Kind")
                .HasValue<Movie>(TitleKinds.Movie)
                .HasValue<TvShow>(TitleKinds.Show);
            // Deleting a title deletes its copies (in the database too, for bulk deletes)
            title.HasMany(t => t.Copies).WithOne().HasForeignKey(c => c.TitleId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
