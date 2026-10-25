using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Kinodex.Api.Data;
using Kinodex.Api.Models;

namespace Kinodex.Api.Endpoints;

public static class UpcEndpoints
{
    // UPCitemdb's free tier: 100 lookups a day per IP, i.e. shared by everyone using this server
    private const string TrialLookupUrl = "https://api.upcitemdb.com/prod/trial/lookup?upc=";

    // A UPC that UPCitemdb had nothing for is looked up again after this long
    private static readonly TimeSpan MissRetryAfter = TimeSpan.FromDays(30);

    // Image hosts whose links are known not to load
    private static readonly string[] BadImageHosts = ["secondspin.com", "sdcd.us", "fye.com"];

    // UPC-A, EAN-13 and similar: 8 to 14 digits
    private static readonly Regex UpcPattern = new(@"^\d{8,14}$");

    public static void MapUpcEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/upc").RequireAuthorization();

        // Product title and images for a UPC: from the saved results when this UPC has been looked
        // up before, otherwise from UPCitemdb (using one of the day's lookups), then saved
        group.MapGet("/lookup/{upc}", async (
            string upc,
            HttpContext context,
            MovieDbContext db,
            IHttpClientFactory httpClientFactory) =>
        {
            upc = upc.Trim();
            if (!UpcPattern.IsMatch(upc))
                return Results.BadRequest(new { message = "A UPC is 8 to 14 digits." });

            var saved = await db.UpcLookups.FirstOrDefaultAsync(u => u.Upc == upc);
            if (saved is not null && (saved.Found || DateTime.UtcNow - saved.LookedUpAt < MissRetryAfter))
                return Results.Ok(ToResponse(saved, cached: true, remaining: null));

            HttpResponseMessage response;
            try
            {
                var client = httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);
                response = await client.GetAsync(TrialLookupUrl + upc);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                return Results.Json(
                    new { message = "Couldn't reach the product lookup service. Try again later." },
                    statusCode: StatusCodes.Status502BadGateway);
            }

            // Pass the day's remaining lookups on to the browser
            string? remaining = null;
            foreach (var header in new[] { "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset" })
            {
                if (response.Headers.TryGetValues(header, out var values))
                {
                    context.Response.Headers[header] = values.FirstOrDefault();
                    if (header == "x-ratelimit-remaining") remaining = values.FirstOrDefault();
                }
            }

            // Failures aren't saved, so the UPC is looked up again next time
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                return Results.Json(
                    new { message = "Today's product image lookups are used up. Try again tomorrow." },
                    statusCode: StatusCodes.Status429TooManyRequests);

            var body = await response.Content.ReadAsStringAsync();
            UpcItemDbResponse? result;
            try
            {
                result = JsonSerializer.Deserialize<UpcItemDbResponse>(body, JsonOptions);
            }
            catch (JsonException)
            {
                result = null;
            }

            if (result?.Code == "INVALID_UPC")
                return Results.BadRequest(new { message = result.Message ?? "That isn't a valid UPC." });
            if (!response.IsSuccessStatusCode || result?.Code != "OK")
                return Results.Json(
                    new { message = "The product lookup service returned an error. Try again later." },
                    statusCode: StatusCodes.Status502BadGateway);

            var item = result.Items?.FirstOrDefault();
            var lookup = saved ?? new UpcLookup { Upc = upc };
            lookup.Found = item is not null;
            lookup.Title = item?.Title ?? item?.Description ?? string.Empty;
            lookup.Images = CleanImages(item?.Images);
            lookup.LookedUpAt = DateTime.UtcNow;
            if (saved is null) db.UpcLookups.Add(lookup);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Someone else saved this UPC at the same moment; their copy is just as good
            }

            return Results.Ok(ToResponse(lookup, cached: false, remaining));
        });
    }

    // Drops blanks, duplicates and known-broken hosts, and puts https links first
    private static List<string> CleanImages(IEnumerable<string>? images) =>
        (images ?? [])
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Where(url => !BadImageHosts.Any(host => url.Contains(host, StringComparison.OrdinalIgnoreCase)))
            .Distinct()
            .OrderBy(url => url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ToList();

    private static object ToResponse(UpcLookup lookup, bool cached, string? remaining) => new
    {
        upc = lookup.Upc,
        found = lookup.Found,
        title = lookup.Title,
        images = lookup.Images,
        cached,
        // Lookups left today; only known when UPCitemdb was just called
        remaining = int.TryParse(remaining, out var n) ? n : (int?)null,
    };

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private record UpcItemDbResponse(string? Code, string? Message, List<UpcItemDbItem>? Items);
    private record UpcItemDbItem(string? Title, string? Description, List<string>? Images);
}
