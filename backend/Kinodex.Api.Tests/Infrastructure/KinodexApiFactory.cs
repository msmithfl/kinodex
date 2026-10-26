using System.Text.Json;
using Kinodex.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Kinodex.Api.Tests.Infrastructure;

// Runs the real API in memory against a throwaway PostgreSQL database.
//
// The database server comes from the KINODEX_TEST_POSTGRES environment variable (a connection
// string), or else the API's appsettings.Development.json. Either way the tests never touch that
// connection's own database: each run creates "kinodex_test_<random>" on the same server, the
// API's startup migrations build the schema in it, and it's dropped when the tests finish.
public class KinodexApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _connectionString;

    public KinodexApiFactory()
    {
        var server = new NpgsqlConnectionStringBuilder(FindServerConnectionString())
        {
            Database = $"kinodex_test_{Guid.NewGuid():N}"[..30],
        };
        _connectionString = server.ConnectionString;

        // Program.cs reads the connection string while building the host, before any test
        // overrides apply, so hand it over the same way the deployed app gets settings
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", _connectionString);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" keeps appsettings.Development.json (and its database) out of the running API
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication(TestAuthHandler.Scheme)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultScheme = TestAuthHandler.Scheme;
                options.DefaultAuthenticateScheme = TestAuthHandler.Scheme;
                options.DefaultChallengeScheme = TestAuthHandler.Scheme;
            });
        });
    }

    // A client whose requests are signed in as the given user (or signed out when null)
    public HttpClient ClientFor(string? userId)
    {
        var client = CreateClient();
        if (userId is not null) client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, userId);
        return client;
    }

    // A user id no other test uses, so tests never see each other's data
    public static string NewUserId() => $"user_{Guid.NewGuid():N}";

    // Direct database access, for checking what an endpoint actually stored
    public async Task<T> WithDbAsync<T>(Func<MovieDbContext, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MovieDbContext>();
        return await action(db);
    }

    // Starting the server runs the API's migrations, creating the test database
    public Task InitializeAsync()
    {
        _ = Server;
        return Task.CompletedTask;
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await WithDbAsync(db => db.Database.EnsureDeletedAsync());
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", null);
        await base.DisposeAsync();
    }

    private static string FindServerConnectionString()
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("KINODEX_TEST_POSTGRES");
        if (!string.IsNullOrWhiteSpace(fromEnvironment)) return fromEnvironment;

        // Walk up from the test output folder to backend/, then read the API's development settings
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var settings = Path.Combine(dir.FullName, "Kinodex.Api", "appsettings.Development.json");
            if (!File.Exists(settings)) continue;

            using var json = JsonDocument.Parse(File.ReadAllText(settings),
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            if (json.RootElement.TryGetProperty("ConnectionStrings", out var strings) &&
                strings.TryGetProperty("DefaultConnection", out var value) &&
                !string.IsNullOrWhiteSpace(value.GetString()))
                return value.GetString()!;
        }

        throw new InvalidOperationException(
            "No PostgreSQL server for the tests. Set KINODEX_TEST_POSTGRES to a connection string, " +
            "or set ConnectionStrings:DefaultConnection in backend/Kinodex.Api/appsettings.Development.json.");
    }
}

// All test classes share one API and database per run
[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<KinodexApiFactory>
{
    public const string Name = "API";
}
