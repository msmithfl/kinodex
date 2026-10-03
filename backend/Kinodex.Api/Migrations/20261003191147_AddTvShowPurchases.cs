using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTvShowPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    PurchasedAt = table.Column<DateOnly>(type: "date", nullable: false)
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

            // Carry each existing show's purchase details into a single purchase before the columns go.
            // The purchase date is the UTC day the show was added.
            migrationBuilder.Sql("""
                INSERT INTO "TvShowPurchases" ("TvShowId", "Seasons", "Price", "UpcNumber", "Formats", "Condition", "PurchasedAt")
                SELECT "Id", "Seasons", round("PurchasePrice"::numeric, 2), "UpcNumber", "Formats", "Condition",
                       ("CreatedAt" AT TIME ZONE 'UTC')::date
                FROM "TvShows"
                WHERE cardinality("Seasons") > 0
                   OR "PurchasePrice" > 0
                   OR "UpcNumber" <> ''
                   OR cardinality("Formats") > 0;
                """);

            migrationBuilder.DropColumn(
                name: "Condition",
                table: "TvShows");

            migrationBuilder.DropColumn(
                name: "Formats",
                table: "TvShows");

            migrationBuilder.DropColumn(
                name: "PurchasePrice",
                table: "TvShows");

            migrationBuilder.DropColumn(
                name: "Seasons",
                table: "TvShows");

            migrationBuilder.DropColumn(
                name: "UpcNumber",
                table: "TvShows");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Condition",
                table: "TvShows",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<List<string>>(
                name: "Formats",
                table: "TvShows",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<float>(
                name: "PurchasePrice",
                table: "TvShows",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<List<int>>(
                name: "Seasons",
                table: "TvShows",
                type: "integer[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<string>(
                name: "UpcNumber",
                table: "TvShows",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Fold purchases back onto the show: every owned season, the total paid,
            // and the UPC, formats and condition of the earliest purchase
            migrationBuilder.Sql("""
                UPDATE "TvShows" t SET
                    "Seasons" = COALESCE((
                        SELECT array_agg(DISTINCT s ORDER BY s)
                        FROM "TvShowPurchases" p, unnest(p."Seasons") AS s
                        WHERE p."TvShowId" = t."Id"), '{}'),
                    "PurchasePrice" = COALESCE((
                        SELECT SUM(p."Price") FROM "TvShowPurchases" p
                        WHERE p."TvShowId" = t."Id"), 0),
                    "UpcNumber" = COALESCE((
                        SELECT p."UpcNumber" FROM "TvShowPurchases" p
                        WHERE p."TvShowId" = t."Id" ORDER BY p."PurchasedAt", p."Id" LIMIT 1), ''),
                    "Formats" = COALESCE((
                        SELECT p."Formats" FROM "TvShowPurchases" p
                        WHERE p."TvShowId" = t."Id" ORDER BY p."PurchasedAt", p."Id" LIMIT 1), '{}'),
                    "Condition" = COALESCE((
                        SELECT p."Condition" FROM "TvShowPurchases" p
                        WHERE p."TvShowId" = t."Id" ORDER BY p."PurchasedAt", p."Id" LIMIT 1), '');
                """);

            migrationBuilder.DropTable(
                name: "TvShowPurchases");
        }
    }
}
