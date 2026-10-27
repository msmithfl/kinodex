using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class MoveTvGiftToPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGift",
                table: "TvShowPurchases",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // A show already marked as a gift: every one of its purchases was a gift
            migrationBuilder.Sql("""
                UPDATE "TvShowPurchases" AS p SET "IsGift" = TRUE
                FROM "TvShows" AS t
                WHERE p."TvShowId" = t."Id" AND t."IsGift";
                """);

            migrationBuilder.DropColumn(
                name: "IsGift",
                table: "TvShows");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGift",
                table: "TvShows",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Back to one flag per show: a gift if any of its purchases was
            migrationBuilder.Sql("""
                UPDATE "TvShows" AS t SET "IsGift" = TRUE
                WHERE EXISTS (SELECT 1 FROM "TvShowPurchases" AS p WHERE p."TvShowId" = t."Id" AND p."IsGift");
                """);

            migrationBuilder.DropColumn(
                name: "IsGift",
                table: "TvShowPurchases");
        }
    }
}
