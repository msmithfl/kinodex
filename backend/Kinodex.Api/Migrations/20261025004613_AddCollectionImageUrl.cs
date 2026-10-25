using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectionImageUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Collections",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Collections");
        }
    }
}
