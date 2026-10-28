using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameIsOnPlexToIsStreaming : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsOnPlex",
                table: "TvShows",
                newName: "IsStreaming");

            migrationBuilder.RenameColumn(
                name: "IsOnPlex",
                table: "Movies",
                newName: "IsStreaming");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsStreaming",
                table: "TvShows",
                newName: "IsOnPlex");

            migrationBuilder.RenameColumn(
                name: "IsStreaming",
                table: "Movies",
                newName: "IsOnPlex");
        }
    }
}
