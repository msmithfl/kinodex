using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Kinodex.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Svix;

namespace Kinodex.Api.Tests;

// Clerk tells the API about new, changed and deleted accounts through signed (Svix) webhooks
[Collection(ApiCollection.Name)]
public class WebhookTests(KinodexApiFactory api)
{
    [Fact]
    public async Task Webhooks_without_a_valid_signature_are_refused()
    {
        var userId = KinodexApiFactory.NewUserId();
        var payload = UserEvent("user.created", userId);

        var unsigned = await PostWebhookAsync(payload, signature: null);
        var wronglySigned = await PostWebhookAsync(payload, signature: "v1,bm90IGEgcmVhbCBzaWduYXR1cmU=");

        Assert.Equal(HttpStatusCode.Unauthorized, unsigned.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wronglySigned.StatusCode);
        Assert.False(await api.WithDbAsync(db => db.Users.AnyAsync(u => u.Id == userId)));
    }

    [Fact]
    public async Task Signed_webhooks_add_and_then_delete_a_user_and_their_data()
    {
        var userId = KinodexApiFactory.NewUserId();

        var created = await PostSignedAsync(UserEvent("user.created", userId));
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        Assert.True(await api.WithDbAsync(db => db.Users.AnyAsync(u => u.Id == userId)));

        var client = api.ClientFor(userId);
        await client.CreateMovieAsync();
        (await client.PostAsJsonAsync("/api/movie-presets", new
        {
            name = "Bookstore",
            upcNumber = "",
            collections = Array.Empty<string>(),
            formats = new[] { "DVD" },
            condition = "Good",
            purchasePrice = 1f,
            purchasedAt = (string?)null,
            rating = 0f,
            review = "",
            productPosterPath = "",
            isGift = false,
            hasWatched = false,
            isStreaming = false,
            shelfSection = "",
            shelfNumber = 0,
            hdDriveNumber = 0,
        })).EnsureSuccessStatusCode();
        Assert.True(await api.WithDbAsync(db => db.MoviePresets.AnyAsync(p => p.UserId == userId)));

        var deleted = await PostSignedAsync(UserEvent("user.deleted", userId));

        Assert.Equal(HttpStatusCode.OK, deleted.StatusCode);
        Assert.False(await api.WithDbAsync(db => db.Users.AnyAsync(u => u.Id == userId)));
        Assert.False(await api.WithDbAsync(db => db.Movies.AnyAsync(m => m.UserId == userId)));
        Assert.False(await api.WithDbAsync(db => db.MoviePresets.AnyAsync(p => p.UserId == userId)));
    }

    private static string UserEvent(string type, string userId) => JsonSerializer.Serialize(new
    {
        type,
        data = new
        {
            id = userId,
            username = userId,
            first_name = "Test",
            last_name = "User",
            email_addresses = new[] { new { email_address = $"{userId}@example.com" } },
        },
    });

    // Signed the way Clerk signs: with the server's secret, over the message id, time and body
    private Task<HttpResponseMessage> PostSignedAsync(string payload)
    {
        var id = $"msg_{Guid.NewGuid():N}";
        var sentAt = DateTimeOffset.UtcNow;
        var signature = new Webhook(KinodexApiFactory.WebhookSecret).Sign(id, sentAt, payload);
        return PostWebhookAsync(payload, signature, id, sentAt);
    }

    private Task<HttpResponseMessage> PostWebhookAsync(
        string payload, string? signature, string? messageId = null, DateTimeOffset? sentAt = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/clerk")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };
        if (signature is not null)
        {
            request.Headers.Add("svix-id", messageId ?? $"msg_{Guid.NewGuid():N}");
            request.Headers.Add("svix-timestamp", (sentAt ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds().ToString());
            request.Headers.TryAddWithoutValidation("svix-signature", signature);
        }
        return api.ClientFor(null).SendAsync(request);
    }
}
