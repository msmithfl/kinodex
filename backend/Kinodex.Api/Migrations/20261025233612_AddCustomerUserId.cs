using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Customers",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Existing customers predate per-user ownership and all belong to the app's original
            // user. A customer who has borrowed something goes to the owner of those movies;
            // the rest go to whoever owns the lent movies overall, or failing that, the owner of
            // the oldest movie.
            migrationBuilder.Sql("""
                UPDATE "Customers" AS c
                SET "UserId" = owners."UserId"
                FROM (
                    SELECT ch."CustomerId", MIN(m."UserId") AS "UserId"
                    FROM "Checkouts" ch
                    JOIN "Movies" m ON m."Id" = ch."MovieId"
                    GROUP BY ch."CustomerId"
                ) AS owners
                WHERE c."Id" = owners."CustomerId";

                UPDATE "Customers"
                SET "UserId" = COALESCE(
                    (SELECT m."UserId"
                     FROM "Checkouts" ch
                     JOIN "Movies" m ON m."Id" = ch."MovieId"
                     GROUP BY m."UserId"
                     ORDER BY COUNT(*) DESC
                     LIMIT 1),
                    (SELECT "UserId" FROM "Movies" ORDER BY "CreatedAt", "Id" LIMIT 1),
                    '')
                WHERE "UserId" = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Customers");
        }
    }
}
