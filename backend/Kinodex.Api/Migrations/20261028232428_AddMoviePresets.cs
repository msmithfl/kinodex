using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMoviePresets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MoviePresets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Formats = table.Column<List<string>>(type: "text[]", nullable: false),
                    Condition = table.Column<string>(type: "text", nullable: false),
                    PurchasePrice = table.Column<float>(type: "real", nullable: false),
                    IsGift = table.Column<bool>(type: "boolean", nullable: false),
                    HasWatched = table.Column<bool>(type: "boolean", nullable: false),
                    IsStreaming = table.Column<bool>(type: "boolean", nullable: false),
                    ShelfSection = table.Column<string>(type: "text", nullable: false),
                    ShelfNumber = table.Column<int>(type: "integer", nullable: false),
                    HDDriveNumber = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MoviePresets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MoviePresets_UserId_Name",
                table: "MoviePresets",
                columns: new[] { "UserId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MoviePresets");
        }
    }
}
