using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddJellyfinItemIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "JellyfinItemId",
                table: "TvShows",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JellyfinItemId",
                table: "Movies",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JellyfinItemId",
                table: "TvShows");

            migrationBuilder.DropColumn(
                name: "JellyfinItemId",
                table: "Movies");
        }
    }
}
