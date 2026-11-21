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

            // As far as purchases go: TitlesAndCopies turns them into copies
            await migrator.MigrateAsync(BeforeCopies);

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

    [Fact]
    public async Task A_saved_jellyfin_connection_compares_every_library_after_the_library_choice_arrives()
    {
        await using var db = NewDatabase();
        try
        {
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261114190143_AddJellyfinConnection");

            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO "JellyfinConnections" ("UserId", "ServerUrl", "ProtectedApiKey", "ServerName", "ServerVersion", "ConnectedAt")
                VALUES ('user', 'https://jellyfin.example.com', 'protected', 'Home', '10.10.7', now());
                """);

            await migrator.MigrateAsync("20261114200607_AddJellyfinLibraryChoice");

            var connection = await db.JellyfinConnections.SingleAsync();
            Assert.Empty(connection.LibraryIds); // Every library
        }
        finally
        {
            await db.Database.EnsureDeletedAsync();
        }
    }

    [Fact]
    public async Task Plain_data_protection_keys_and_the_connections_they_protected_are_cleared()
    {
        await using var db = NewDatabase();
        try
        {
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261114200607_AddJellyfinLibraryChoice");

            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO "JellyfinConnections" ("UserId", "ServerUrl", "ProtectedApiKey", "ServerName", "ServerVersion", "ConnectedAt", "LibraryIds")
                VALUES ('user', 'https://jellyfin.example.com', 'protected', 'Home', '10.10.7', now(), ARRAY[]::text[]);
                INSERT INTO "DataProtectionKeys" ("FriendlyName", "Xml")
                VALUES ('plain', '<key><descriptor><masterKey><value>abc</value></masterKey></descriptor></key>'),
                       ('locked', '<key><descriptor><encryptedSecret decryptorType="x"><encryptedKey /></encryptedSecret></descriptor></key>');
                """);

            await migrator.MigrateAsync();

            Assert.Empty(await db.JellyfinConnections.ToListAsync());
            Assert.Equal(["locked"], await db.DataProtectionKeys.Select(k => k.FriendlyName).ToListAsync());
        }
        finally
        {
            await db.Database.EnsureDeletedAsync();
        }
    }

    // The last migration before movies and shows became titles with copies
    private const string BeforeCopies = "20261115025408_AddJellyfinItemIds";

    [Fact]
    public async Task Movies_and_shows_become_titles_with_their_details_as_copies_and_back_again()
    {
        await using var db = NewDatabase();
        try
        {
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync(BeforeCopies);

            // Ids given by hand, so the sequence hasn't moved: the shows' new ids must still not clash
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO "Movies" ("Id", "UserId", "Title", "UpcNumber", "Formats", "Collections", "Condition",
                    "PurchasePrice", "PurchasedAt", "HasWatched", "Rating", "Review", "Year", "Genres", "PosterPath",
                    "BackdropPath", "ProductPosterPath", "TmdbId", "HDDriveNumber", "ShelfNumber", "ShelfSection",
                    "IsStreaming", "JellyfinItemId", "IsGift", "CreatedAt")
                VALUES
                    (1, 'user', 'Die Hard', '111', ARRAY['VHS'], ARRAY['Action'], 'Good', 3.5, '1995-06-01', true, 4.5,
                     'Yippee', 1988, ARRAY['Action'], '/p.jpg', '/b.jpg', 'https://example.com/vhs.jpg', 562, 2, 12, 'A',
                     true, 'abc', false, '2024-01-01T00:00:00Z'),
                    (2, 'user', 'Heat', '', ARRAY[]::text[], ARRAY[]::text[], '', 0, '2024-02-01', false, 0,
                     '', 1995, ARRAY[]::text[], '', '', '', NULL, 0, 0, '', false, NULL, true, '2024-02-01T00:00:00Z');
                INSERT INTO "TvShows" ("Id", "UserId", "Title", "HasWatched", "Rating", "Review", "Year", "Genres",
                    "PosterPath", "BackdropPath", "TmdbId", "TotalSeasons", "IsStreaming", "JellyfinItemId", "CreatedAt")
                VALUES
                    (1, 'user', 'The Wire', true, 5, 'All in', 2002, ARRAY['Crime'], '/w.jpg', '', 1438, 5, false, NULL, '2024-03-01T00:00:00Z'),
                    (2, 'user', 'Lost', false, 0, '', 2004, ARRAY[]::text[], '', '', 4607, 6, false, NULL, '2024-04-01T00:00:00Z');
                INSERT INTO "TvShowPurchases" ("Id", "TvShowId", "Seasons", "Price", "UpcNumber", "Formats",
                    "Condition", "PurchasedAt", "IsGift", "ProductPosterPath")
                VALUES
                    (10, 1, ARRAY[1,2], 19.99, '222', ARRAY['DVD'], 'Good', '2024-03-01', false, 'https://example.com/s12.jpg'),
                    (11, 1, ARRAY[3], 0, '', ARRAY['Blu-ray'], 'New', '2024-05-01', true, '');
                INSERT INTO "Collections" ("Id", "UserId", "Name", "IsDirectorCollection", "CreatedAt")
                VALUES (1, 'user', 'Action', false, now());
                INSERT INTO "CollectionListItems" ("Id", "UserId", "CollectionId", "Title", "Year", "TmdbId", "CreatedAt")
                VALUES (1, 'user', 1, 'Die Hard', 1988, 562, now());
                """);

            await migrator.MigrateAsync();

            var movies = await db.Movies.AsNoTracking().Include(m => m.Copies).OrderBy(m => m.Id).ToListAsync();
            Assert.Equal([1, 2], movies.Select(m => m.Id)); // Movies keep their ids
            var dieHard = movies[0];
            Assert.Equal(("Die Hard", 562, true, 4.5f, "abc", true), (dieHard.Title, dieHard.TmdbId, dieHard.HasWatched, dieHard.Rating, dieHard.JellyfinItemId, dieHard.IsStreaming));
            Assert.Equal(["Action"], dieHard.Collections);
            var vhs = Assert.Single(dieHard.Copies);
            Assert.Equal(("111", "Good", 3.5m, new DateOnly(1995, 6, 1), "https://example.com/vhs.jpg", "A", 12, 2),
                (vhs.UpcNumber, vhs.Condition, vhs.Price, vhs.PurchasedAt, vhs.ProductPosterPath, vhs.ShelfSection, vhs.ShelfNumber, vhs.HDDriveNumber));
            Assert.Equal(["VHS"], vhs.Formats);
            Assert.Empty(vhs.Seasons);
            Assert.Equal(dieHard.CreatedAt, vhs.CreatedAt);
            Assert.True(Assert.Single(movies[1].Copies).IsGift);

            var shows = await db.TvShows.AsNoTracking().Include(s => s.Copies.OrderBy(c => c.Id)).OrderBy(s => s.CreatedAt).ToListAsync();
            Assert.Equal(["The Wire", "Lost"], shows.Select(s => s.Title));
            Assert.All(shows, s => Assert.True(s.Id > 2)); // New ids, after the movies'
            var wire = shows[0];
            Assert.Equal((5, true, 5f, "All in", 1438), (wire.TotalSeasons, wire.HasWatched, wire.Rating, wire.Review, wire.TmdbId));
            Assert.Empty(wire.Collections);
            Assert.Equal([[1, 2], [3]], wire.Copies.Select(c => c.Seasons));
            Assert.Equal((19.99m, "222", "https://example.com/s12.jpg", "", 0), (wire.Copies[0].Price, wire.Copies[0].UpcNumber, wire.Copies[0].ProductPosterPath, wire.Copies[0].ShelfSection, wire.Copies[0].HDDriveNumber));
            Assert.True(wire.Copies[1].IsGift);
            Assert.Empty(shows[1].Copies);

            Assert.Equal("movie", (await db.CollectionListItems.AsNoTracking().SingleAsync()).Kind);

            // New titles carry on numbering after them
            db.Movies.Add(new Kinodex.Api.Models.Movie { UserId = "user", Title = "Aliens" });
            await db.SaveChangesAsync();

            // And back: each movie has its copy's details again, the shows and their purchases return
            await migrator.MigrateAsync(BeforeCopies);

            var movieRows = await db.Database
                .SqlQueryRaw<OldMovieRow>("""SELECT "Id", "Title", "UpcNumber", "PurchasePrice", "HDDriveNumber" FROM "Movies" ORDER BY "Id" """)
                .ToListAsync();
            Assert.Equal(["Die Hard", "Heat", "Aliens"], movieRows.Select(m => m.Title));
            Assert.Equal(("111", 3.5f, 2), (movieRows[0].UpcNumber, movieRows[0].PurchasePrice, movieRows[0].HDDriveNumber));
            var purchaseSeasons = await db.Database
                .SqlQueryRaw<OldPurchaseRow>("""SELECT p."Id", s."Title", p."Seasons" FROM "TvShowPurchases" p JOIN "TvShows" s ON s."Id" = p."TvShowId" ORDER BY p."Id" """)
                .ToListAsync();
            Assert.Equal(["The Wire", "The Wire"], purchaseSeasons.Select(p => p.Title));
            Assert.Equal([[1, 2], [3]], purchaseSeasons.Select(p => p.Seasons));
        }
        finally
        {
            await db.Database.EnsureDeletedAsync();
        }
    }

    private class OldMovieRow
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public string UpcNumber { get; set; } = "";
        public float PurchasePrice { get; set; }
        public int HDDriveNumber { get; set; }
    }

    private class OldPurchaseRow
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public List<int> Seasons { get; set; } = [];
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
