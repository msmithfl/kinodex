using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMoviePresetFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "Collections",
                table: "MoviePresets",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<string>(
                name: "ProductPosterPath",
                table: "MoviePresets",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "PurchasedAt",
                table: "MoviePresets",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "Rating",
                table: "MoviePresets",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<string>(
                name: "Review",
                table: "MoviePresets",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UpcNumber",
                table: "MoviePresets",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Collections",
                table: "MoviePresets");

            migrationBuilder.DropColumn(
                name: "ProductPosterPath",
                table: "MoviePresets");

            migrationBuilder.DropColumn(
                name: "PurchasedAt",
                table: "MoviePresets");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "MoviePresets");

            migrationBuilder.DropColumn(
                name: "Review",
                table: "MoviePresets");

            migrationBuilder.DropColumn(
                name: "UpcNumber",
                table: "MoviePresets");
        }
    }
}
