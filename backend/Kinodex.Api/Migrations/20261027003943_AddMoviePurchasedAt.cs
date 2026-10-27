using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMoviePurchasedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "PurchasedAt",
                table: "Movies",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            // Existing movies were bought, as far as anyone knows, on the day they were added
            // (the UTC day, as when TV purchases got their dates)
            migrationBuilder.Sql("""
                UPDATE "Movies" SET "PurchasedAt" = ("CreatedAt" AT TIME ZONE 'UTC')::date;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PurchasedAt",
                table: "Movies");
        }
    }
}
