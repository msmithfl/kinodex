using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <summary>
    /// A TV show's product image (box art) moves onto its purchases, since each purchase has its
    /// own UPC. A show's existing image goes to its earliest purchase; a show with no purchases
    /// loses it (no purchase, no product image).
    /// </summary>
    public partial class MoveProductImageToTvPurchases : Migration
    {
        // The show's earliest purchase (by purchase date, then the order it was added)
        private const string EarliestPurchaseId = """
            (SELECT first."Id" FROM "TvShowPurchases" AS first
             WHERE first."TvShowId" = show."Id"
             ORDER BY first."PurchasedAt", first."Id"
             LIMIT 1)
            """;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProductPosterPath",
                table: "TvShowPurchases",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql($"""
                UPDATE "TvShowPurchases" AS purchase
                SET "ProductPosterPath" = show."ProductPosterPath"
                FROM "TvShows" AS show
                WHERE purchase."TvShowId" = show."Id"
                  AND show."ProductPosterPath" <> ''
                  AND purchase."Id" = {EarliestPurchaseId};
                """);

            migrationBuilder.DropColumn(
                name: "ProductPosterPath",
                table: "TvShows");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProductPosterPath",
                table: "TvShows",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Back onto the show from its earliest purchase (other purchases' images are lost)
            migrationBuilder.Sql($"""
                UPDATE "TvShows" AS show
                SET "ProductPosterPath" = purchase."ProductPosterPath"
                FROM "TvShowPurchases" AS purchase
                WHERE purchase."TvShowId" = show."Id"
                  AND purchase."Id" = {EarliestPurchaseId};
                """);

            migrationBuilder.DropColumn(
                name: "ProductPosterPath",
                table: "TvShowPurchases");
        }
    }
}
