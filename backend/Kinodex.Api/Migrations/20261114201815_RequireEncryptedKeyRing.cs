using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kinodex.Api.Migrations
{
    /// <summary>
    /// From here on, Data Protection's keys are saved encrypted with DATA_PROTECTION_SECRET
    /// (Services/DataProtectionSecret.cs). The keys saved before were plain, so they go, and with
    /// them the Jellyfin connections whose API keys they protected: those users connect again.
    /// </summary>
    public partial class RequireEncryptedKeyRing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "JellyfinConnections";
                DELETE FROM "DataProtectionKeys" WHERE "Xml" IS NULL OR "Xml" NOT LIKE '%encryptedSecret%';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to bring back
        }
    }
}
