using Kinodex.Api.Data;
using Kinodex.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace Kinodex.Api.Tests;

// Migrations that move existing data. Each test gets a database of its own (on the same server as
// the API tests), built up to just before the migration, filled with rows in the old shape, then
// migrated the rest of the way.
public class MigrationTests
{
    [Fact]
    public async Task A_tv_shows_product_image_moves_to_its_earliest_purchase()
    {
        await using var db = NewDatabase();
        try
        {
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261111041316_RemoveLending");

            // Two shows with box art: one with two purchases (the later one added first), and one
            // with none, whose image has nowhere to go
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO "TvShows" ("Id", "UserId", "Title", "HasWatched", "Rating", "Review", "Year", "Genres",
                    "PosterPath", "BackdropPath", "ProductPosterPath", "TotalSeasons", "IsStreaming", "CreatedAt")
                VALUES
                    (1, 'user', 'The Wire', false, 0, '', 2002, ARRAY[]::text[], '', '', 'https://example.com/wire.jpg', 5, false, now()),
                    (2, 'user', 'Lost', false, 0, '', 2004, ARRAY[]::text[], '', '', 'https://example.com/lost.jpg', 6, false, now());
                INSERT INTO "TvShowPurchases" ("Id", "TvShowId", "Seasons", "Price", "UpcNumber", "Formats",
                    "Condition", "PurchasedAt", "IsGift")
                VALUES
                    (10, 1, ARRAY[2,3], 0, '', ARRAY[]::text[], '', '2026-03-01', false),
                    (11, 1, ARRAY[1], 0, '', ARRAY[]::text[], '', '2026-01-15', false);
                """);

            await migrator.MigrateAsync();

            var images = await db.Database
                .SqlQueryRaw<PurchaseImage>("""SELECT "Id", "ProductPosterPath" FROM "TvShowPurchases" """)
                .ToDictionaryAsync(p => p.Id, p => p.ProductPosterPath);
            Assert.Equal("https://example.com/wire.jpg", images[11]); // The earliest purchase
            Assert.Equal("", images[10]);
        }
        finally
        {
            await db.Database.EnsureDeletedAsync();
        }
    }

    private class PurchaseImage
    {
        public int Id { get; set; }
        public string ProductPosterPath { get; set; } = "";
    }

    private static MovieDbContext NewDatabase()
    {
        var connection = new NpgsqlConnectionStringBuilder(KinodexApiFactory.FindServerConnectionString())
        {
            Database = $"kinodex_test_{Guid.NewGuid():N}"[..30],
        };
        var options = new DbContextOptionsBuilder<MovieDbContext>().UseNpgsql(connection.ConnectionString).Options;
        return new MovieDbContext(options);
    }
}
