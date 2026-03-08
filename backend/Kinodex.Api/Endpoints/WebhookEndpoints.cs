using Microsoft.EntityFrameworkCore;
using Svix;
using System.Text.Json;
using Kinodex.Api.Data;
using Kinodex.Api.Models;

namespace Kinodex.Api.Endpoints;

public static class WebhookEndpoints
{
    public static void MapWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/webhooks");

        group.MapPost("/clerk", async (HttpContext context, MovieDbContext db, IConfiguration config) =>
        {
            // Read body first (must be done before any other reads)
            using var reader = new StreamReader(context.Request.Body);
            var payload = await reader.ReadToEndAsync();

            // Verify Svix signature
            var webhookSecret = config["Clerk:WebhookSecret"];
            if (string.IsNullOrEmpty(webhookSecret))
            {
                Console.WriteLine("ERROR: Clerk:WebhookSecret is not configured.");
                return Results.Problem("Webhook secret not configured.", statusCode: 500);
            }

            try
            {
                var svixHeaders = new System.Net.WebHeaderCollection();
                foreach (var header in context.Request.Headers)
                    svixHeaders.Add(header.Key, header.Value.ToString());

                var wh = new Webhook(webhookSecret);
                wh.Verify(payload, svixHeaders);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Webhook signature verification failed: {ex.Message}");
                return Results.Unauthorized();
            }

            Console.WriteLine($"Received webhook payload: {payload}");

            try
            {
                var webhookData = JsonSerializer.Deserialize<JsonElement>(payload);
                var eventType = webhookData.GetProperty("type").GetString();

                Console.WriteLine($"Event type: {eventType}");

                if (eventType == "user.created")
                {
                    var data = webhookData.GetProperty("data");
                    var userId = data.GetProperty("id").GetString()!;
                    
                    // Get email first
                    var emailAddresses = data.GetProperty("email_addresses");
                    var primaryEmail = "";
                    if (emailAddresses.GetArrayLength() > 0)
                    {
                        primaryEmail = emailAddresses[0].GetProperty("email_address").GetString()!;
                    }
                    
                    // Check if user already exists by ID OR email (prevent duplicates)
                    var existingUser = await db.Users
                        .FirstOrDefaultAsync(u => u.Id == userId || u.Email == primaryEmail);
                    
                    if (existingUser != null)
                    {
                        Console.WriteLine($"User already exists - ID: {existingUser.Id}, Email: {existingUser.Email}");
                        return Results.Ok(new { received = true, message = "User already exists" });
                    }
                    
                    // Get name fields
                    var firstName = data.TryGetProperty("first_name", out var fn) ? fn.GetString() : null;
                    var lastName = data.TryGetProperty("last_name", out var ln) ? ln.GetString() : null;
                    var username = data.GetProperty("username").GetString();

                    var user = new User
                    {
                        Id = userId,
                        FirstName = firstName,
                        LastName = lastName,
                        Username = username ?? primaryEmail.Split('@')[0],
                        Email = primaryEmail,
                        CreatedAt = DateTime.UtcNow
                    };

                    db.Users.Add(user);
                    await db.SaveChangesAsync();
                    
                    Console.WriteLine($"Created new user - ID: {userId}, Email: {primaryEmail}");
                }
                else if (eventType == "user.updated")
                {
                    var data = webhookData.GetProperty("data");
                    var userId = data.GetProperty("id").GetString()!;
                    
                    var user = await db.Users.FindAsync(userId);
                    if (user != null)
                    {
                        // Update name fields
                        user.FirstName = data.TryGetProperty("first_name", out var fn) ? fn.GetString() : user.FirstName;
                        user.LastName = data.TryGetProperty("last_name", out var ln) ? ln.GetString() : user.LastName;
                        
                        // Update username
                        if (data.TryGetProperty("username", out var un) && un.ValueKind != JsonValueKind.Null)
                        {
                            user.Username = un.GetString() ?? user.Username;
                        }
                        
                        // Update email if changed
                        var emailAddresses = data.GetProperty("email_addresses");
                        if (emailAddresses.GetArrayLength() > 0)
                        {
                            var primaryEmail = emailAddresses[0].GetProperty("email_address").GetString()!;
                            user.Email = primaryEmail;
                        }
                        
                        await db.SaveChangesAsync();
                        
                        Console.WriteLine($"Updated user - ID: {userId}");
                    }
                    else
                    {
                        Console.WriteLine($"User not found for update - ID: {userId}");
                    }
                }
                else if (eventType == "user.deleted")
                {
                    var data = webhookData.GetProperty("data");
                    var userId = data.GetProperty("id").GetString()!;
                    
                    var user = await db.Users.FindAsync(userId);
                    if (user != null)
                    {
                        db.Users.Remove(user);
                        await db.SaveChangesAsync();
                        
                        Console.WriteLine($"Deleted user - ID: {userId}");
                    }
                    else
                    {
                        Console.WriteLine($"User not found for deletion - ID: {userId}");
                    }
                }

                return Results.Ok(new { received = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Webhook error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}
