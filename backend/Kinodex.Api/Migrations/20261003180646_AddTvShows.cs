using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTvShows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TvShows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    UpcNumber = table.Column<string>(type: "text", nullable: false),
                    Formats = table.Column<List<string>>(type: "text[]", nullable: false),
                    Condition = table.Column<string>(type: "text", nullable: false),
                    PurchasePrice = table.Column<float>(type: "real", nullable: false),
                    HasWatched = table.Column<bool>(type: "boolean", nullable: false),
                    Rating = table.Column<float>(type: "real", nullable: false),
                    Review = table.Column<string>(type: "text", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Genres = table.Column<List<string>>(type: "text[]", nullable: false),
                    PosterPath = table.Column<string>(type: "text", nullable: false),
                    BackdropPath = table.Column<string>(type: "text", nullable: false),
                    ProductPosterPath = table.Column<string>(type: "text", nullable: false),
                    TmdbId = table.Column<int>(type: "integer", nullable: true),
                    Seasons = table.Column<List<int>>(type: "integer[]", nullable: false),
                    TotalSeasons = table.Column<int>(type: "integer", nullable: false),
                    IsOnPlex = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvShows", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TvShows");
        }
    }
}
