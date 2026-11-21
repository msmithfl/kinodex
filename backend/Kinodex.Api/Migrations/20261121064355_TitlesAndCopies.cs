using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Kinodex.Api.Migrations
{
    // Movies and TV shows become one Titles table, and their physical details move to Copies
    // (docs/design/titles-and-copies.md). Written by hand, as the scaffolded version dropped Movies:
    // - Movies is renamed Titles, so every movie keeps its id, and each movie gets one copy made
    //   from its own columns (UPC, formats, condition, price, dates, gift, image, shelf, HDD).
    // - Every TV show moves into Titles with a new id, and each of its purchases becomes a copy.
    // - Then the old columns and tables go.
    /// <inheritdoc />
    public partial class TitlesAndCopies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(name: "PK_Movies", table: "Movies");
            migrationBuilder.RenameTable(name: "Movies", newName: "Titles");
            migrationBuilder.AddPrimaryKey(name: "PK_Titles", table: "Titles", column: "Id");

            // Every row so far is a movie
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Titles",
                type: "character varying(13)",
                maxLength: 13,
                nullable: false,
                defaultValue: "movie");

            migrationBuilder.AddColumn<int>(
                name: "TotalSeasons",
                table: "Titles",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Copies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TitleId = table.Column<int>(type: "integer", nullable: false),
                    Seasons = table.Column<List<int>>(type: "integer[]", nullable: false),
                    UpcNumber = table.Column<string>(type: "text", nullable: false),
                    Formats = table.Column<List<string>>(type: "text[]", nullable: false),
                    Condition = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    PurchasedAt = table.Column<DateOnly>(type: "date", nullable: false),
                    IsGift = table.Column<bool>(type: "boolean", nullable: false),
                    ProductPosterPath = table.Column<string>(type: "text", nullable: false),
                    ShelfSection = table.Column<string>(type: "text", nullable: false),
                    ShelfNumber = table.Column<int>(type: "integer", nullable: false),
                    HDDriveNumber = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Copies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Copies_Titles_TitleId",
                        column: x => x.TitleId,
                        principalTable: "Titles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Copies_TitleId",
                table: "Copies",
                column: "TitleId");

            migrationBuilder.Sql("""
                -- One copy per movie, from its own columns; a movie's "date added" is its copy's too
                INSERT INTO "Copies" ("TitleId", "Seasons", "UpcNumber", "Formats", "Condition", "Price",
                    "PurchasedAt", "IsGift", "ProductPosterPath", "ShelfSection", "ShelfNumber", "HDDriveNumber", "CreatedAt")
                SELECT "Id", ARRAY[]::integer[], "UpcNumber", "Formats", "Condition", round("PurchasePrice"::numeric, 2),
                    "PurchasedAt", "IsGift", "ProductPosterPath", "ShelfSection", "ShelfNumber", "HDDriveNumber", "CreatedAt"
                FROM "Titles"
                ORDER BY "Id";

                -- New ids for TV shows carry on after the highest movie id
                SELECT setval(pg_get_serial_sequence('"Titles"', 'Id'), (SELECT COALESCE(MAX("Id"), 0) + 1 FROM "Titles"), false);

                -- Each show, remembering its old id until its purchases have followed it. The movie
                -- columns about to go need values meanwhile.
                ALTER TABLE "Titles" ADD COLUMN "OldTvShowId" integer;
                INSERT INTO "Titles" ("Kind", "OldTvShowId", "UserId", "Title", "Year", "Genres", "Collections",
                    "PosterPath", "BackdropPath", "TmdbId", "HasWatched", "Rating", "Review", "IsStreaming",
                    "JellyfinItemId", "CreatedAt", "TotalSeasons",
                    "UpcNumber", "Formats", "Condition", "PurchasePrice", "PurchasedAt", "IsGift",
                    "ProductPosterPath", "ShelfSection", "ShelfNumber", "HDDriveNumber")
                SELECT 'show', "Id", "UserId", "Title", "Year", "Genres", ARRAY[]::text[],
                    "PosterPath", "BackdropPath", "TmdbId", "HasWatched", "Rating", "Review", "IsStreaming",
                    "JellyfinItemId", "CreatedAt", "TotalSeasons",
                    '', ARRAY[]::text[], '', 0, "CreatedAt"::date, false, '', '', 0, 0
                FROM "TvShows"
                ORDER BY "Id";

                -- Each purchase becomes a copy of its show (no shelf or HDD yet: shows had none)
                INSERT INTO "Copies" ("TitleId", "Seasons", "UpcNumber", "Formats", "Condition", "Price",
                    "PurchasedAt", "IsGift", "ProductPosterPath", "ShelfSection", "ShelfNumber", "HDDriveNumber", "CreatedAt")
                SELECT t."Id", p."Seasons", p."UpcNumber", p."Formats", p."Condition", p."Price",
                    p."PurchasedAt", p."IsGift", p."ProductPosterPath", '', 0, 0, t."CreatedAt"
                FROM "TvShowPurchases" p
                JOIN "Titles" t ON t."OldTvShowId" = p."TvShowId"
                ORDER BY p."Id";

                ALTER TABLE "Titles" DROP COLUMN "OldTvShowId";
                ALTER TABLE "Titles" ALTER COLUMN "Kind" DROP DEFAULT;
                """);

            migrationBuilder.DropTable(name: "TvShowPurchases");
            migrationBuilder.DropTable(name: "TvShows");

            foreach (var column in MovieCopyColumns)
                migrationBuilder.DropColumn(name: column, table: "Titles");

            // Every checklist item so far is a movie
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "CollectionListItems",
                type: "text",
                nullable: false,
                defaultValue: "movie");
            migrationBuilder.Sql("""ALTER TABLE "CollectionListItems" ALTER COLUMN "Kind" DROP DEFAULT;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Kind", table: "CollectionListItems");

            // A movie gets its earliest copy's details back (any others are lost); one with no copies
            // gets blanks, dated the day it was added
            migrationBuilder.Sql("""
                ALTER TABLE "Titles"
                    ADD COLUMN "UpcNumber" text NOT NULL DEFAULT '',
                    ADD COLUMN "Formats" text[] NOT NULL DEFAULT ARRAY[]::text[],
                    ADD COLUMN "Condition" text NOT NULL DEFAULT '',
                    ADD COLUMN "PurchasePrice" real NOT NULL DEFAULT 0,
                    ADD COLUMN "PurchasedAt" date NOT NULL DEFAULT CURRENT_DATE,
                    ADD COLUMN "IsGift" boolean NOT NULL DEFAULT false,
                    ADD COLUMN "ProductPosterPath" text NOT NULL DEFAULT '',
                    ADD COLUMN "ShelfSection" text NOT NULL DEFAULT '',
                    ADD COLUMN "ShelfNumber" integer NOT NULL DEFAULT 0,
                    ADD COLUMN "HDDriveNumber" integer NOT NULL DEFAULT 0;

                UPDATE "Titles" t SET "PurchasedAt" = t."CreatedAt"::date WHERE t."Kind" = 'movie';
                UPDATE "Titles" t SET
                    "UpcNumber" = c."UpcNumber", "Formats" = c."Formats", "Condition" = c."Condition",
                    "PurchasePrice" = c."Price"::real, "PurchasedAt" = c."PurchasedAt", "IsGift" = c."IsGift",
                    "ProductPosterPath" = c."ProductPosterPath", "ShelfSection" = c."ShelfSection",
                    "ShelfNumber" = c."ShelfNumber", "HDDriveNumber" = c."HDDriveNumber"
                FROM (
                    SELECT DISTINCT ON ("TitleId") * FROM "Copies" ORDER BY "TitleId", "PurchasedAt", "Id"
                ) c
                WHERE c."TitleId" = t."Id" AND t."Kind" = 'movie';
                """);

            migrationBuilder.CreateTable(
                name: "TvShows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    HasWatched = table.Column<bool>(type: "boolean", nullable: false),
                    Rating = table.Column<float>(type: "real", nullable: false),
                    Review = table.Column<string>(type: "text", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Genres = table.Column<List<string>>(type: "text[]", nullable: false),
                    PosterPath = table.Column<string>(type: "text", nullable: false),
                    BackdropPath = table.Column<string>(type: "text", nullable: false),
                    TmdbId = table.Column<int>(type: "integer", nullable: true),
                    TotalSeasons = table.Column<int>(type: "integer", nullable: false),
                    IsStreaming = table.Column<bool>(type: "boolean", nullable: false),
                    JellyfinItemId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvShows", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TvShowPurchases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TvShowId = table.Column<int>(type: "integer", nullable: false),
                    Seasons = table.Column<List<int>>(type: "integer[]", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    UpcNumber = table.Column<string>(type: "text", nullable: false),
                    Formats = table.Column<List<string>>(type: "text[]", nullable: false),
                    Condition = table.Column<string>(type: "text", nullable: false),
                    PurchasedAt = table.Column<DateOnly>(type: "date", nullable: false),
                    IsGift = table.Column<bool>(type: "boolean", nullable: false),
                    ProductPosterPath = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvShowPurchases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TvShowPurchases_TvShows_TvShowId",
                        column: x => x.TvShowId,
                        principalTable: "TvShows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TvShowPurchases_TvShowId",
                table: "TvShowPurchases",
                column: "TvShowId");

            // Shows (keeping their ids) and their copies go back; their collections, and their copies'
            // shelf and HDD, have nowhere to go
            migrationBuilder.Sql("""
                INSERT INTO "TvShows" ("Id", "UserId", "Title", "HasWatched", "Rating", "Review", "Year", "Genres",
                    "PosterPath", "BackdropPath", "TmdbId", "TotalSeasons", "IsStreaming", "JellyfinItemId", "CreatedAt")
                SELECT "Id", "UserId", "Title", "HasWatched", "Rating", "Review", "Year", "Genres",
                    "PosterPath", "BackdropPath", "TmdbId", COALESCE("TotalSeasons", 0), "IsStreaming", "JellyfinItemId", "CreatedAt"
                FROM "Titles" WHERE "Kind" = 'show';
                SELECT setval(pg_get_serial_sequence('"TvShows"', 'Id'), (SELECT COALESCE(MAX("Id"), 0) + 1 FROM "TvShows"), false);

                INSERT INTO "TvShowPurchases" ("TvShowId", "Seasons", "Price", "UpcNumber", "Formats", "Condition",
                    "PurchasedAt", "IsGift", "ProductPosterPath")
                SELECT c."TitleId", c."Seasons", c."Price", c."UpcNumber", c."Formats", c."Condition",
                    c."PurchasedAt", c."IsGift", c."ProductPosterPath"
                FROM "Copies" c JOIN "Titles" t ON t."Id" = c."TitleId"
                WHERE t."Kind" = 'show'
                ORDER BY c."Id";

                DELETE FROM "Titles" WHERE "Kind" = 'show';
                """);

            migrationBuilder.DropTable(name: "Copies");
            migrationBuilder.DropColumn(name: "Kind", table: "Titles");
            migrationBuilder.DropColumn(name: "TotalSeasons", table: "Titles");

            migrationBuilder.DropPrimaryKey(name: "PK_Titles", table: "Titles");
            migrationBuilder.RenameTable(name: "Titles", newName: "Movies");
            migrationBuilder.AddPrimaryKey(name: "PK_Movies", table: "Movies", column: "Id");
        }

        // The movie columns that are now a copy's
        private static readonly string[] MovieCopyColumns =
        [
            "UpcNumber", "Formats", "Condition", "PurchasePrice", "PurchasedAt", "IsGift",
            "ProductPosterPath", "ShelfSection", "ShelfNumber", "HDDriveNumber",
        ];
    }
}
