using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MovieVault.Api.Data;
using MovieVault.Api.Endpoints;
using MovieVault.Api.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Add HttpClient for TMDB service
builder.Services.AddHttpClient();
builder.Services.AddScoped<TmdbMatchingService>();

// Configure JSON serialization to use camelCase and handle circular references
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Database - handle both Railway URL format and standard connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    // Try DATABASE_URL (Railway default)
    var databaseUrl = builder.Configuration["DATABASE_URL"];
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        try
        {
            // Convert postgresql:// URL to Npgsql format with connection pooling
            var uri = new Uri(databaseUrl);
            connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={uri.UserInfo.Split(':')[0]};Password={uri.UserInfo.Split(':')[1]};SSL Mode=Require;Trust Server Certificate=true;Minimum Pool Size=0;Maximum Pool Size=10;Connection Idle Lifetime=60;Connection Pruning Interval=10";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing DATABASE_URL: {ex.Message}");
            throw new InvalidOperationException("Failed to parse DATABASE_URL. Please check the format.", ex);
        }
    }
}

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("No database connection string found. Please set ConnectionStrings:DefaultConnection or DATABASE_URL.");
}

Console.WriteLine($"Connection String: SET");

builder.Services.AddDbContext<MovieDbContext>(options =>
{
    options.UseNpgsql(connectionString);
    // Enable connection resiliency
    options.EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
}, ServiceLifetime.Scoped);

// Add CORS - reads from environment variable or appsettings.{Environment}.json
var corsOriginsEnv = Environment.GetEnvironmentVariable("CORS_ORIGINS");
string[] corsOrigins;

if (!string.IsNullOrEmpty(corsOriginsEnv))
{
    // Split comma-separated environment variable
    corsOrigins = corsOriginsEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
else
{
    // Fallback to JSON configuration
    var corsOriginsSection = builder.Configuration.GetSection("CorsOrigins");
    corsOrigins = corsOriginsSection.Get<string[]>() 
        ?? new[] { "http://localhost:5173", "https://localhost:5173", "http://localhost:5174", "https://localhost:5174" }; // Final fallback for local dev
}

Console.WriteLine($"Environment: {builder.Environment.EnvironmentName}");
Console.WriteLine($"CORS Origins: {string.Join(", ", corsOrigins)}");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset");
    });
});

// Clerk JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://{builder.Configuration["Clerk:Domain"]}";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://{builder.Configuration["Clerk:Domain"]}",
            ValidateAudience = false,
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Run migrations automatically on startup
await app.MigrateDbAsync();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// CORS must come before UseHttpsRedirection
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Map movie endpoints
app.MapWebhookEndpoints();
app.MapMovieEndpoints();
app.MapCollectionEndpoints();
app.MapShelfSectionEndpoints();
app.MapUpcEndpoints();
app.MapEbayEndpoints();
app.MapProductEndpoints();
app.MapCollectionListItemEndpoints();
app.MapTmdbMatchingEndpoints();
app.MapCustomerEndpoints();
app.MapCheckoutEndpoints();

app.Run();
