using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using MovieVault.Api.Data;
using MovieVault.Api.Models;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Net;

namespace MovieVault.Api.Endpoints;

public static class EbayEndpoints
{
    private static readonly string[] PriceClassSelectors =
    [
        "s-item__price",
        "s-card__price",
    ];

    // Matches dollar amounts like $19.99 or $1,299.00
    private static readonly Regex PriceRegex = new(@"\$\s*([\d]{1,4}(?:,\d{3})*\.\d{2})", RegexOptions.Compiled);

    private static readonly TimeSpan CacheDuration = TimeSpan.FromDays(30);

    public static void MapEbayEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ebay");

        group.MapGet("/sold-average/{upc}", async (string upc, MovieDbContext db) =>
        {
            // Return cached result from Products if fresh
            var cached = await db.Products.FindAsync(upc);
            if (cached?.EbayCachedAt != null && DateTimeOffset.UtcNow - cached.EbayCachedAt < CacheDuration)
                return Results.Ok(new { average = cached.EbayAveragePrice, count = cached.EbayPriceCount });

            try
            {
                var html = await FetchEbayHtml(upc);
                var prices = ExtractPricesFromHtml(html);

                if (prices.Count == 0)
                    return Results.Ok(new { average = (decimal?)null, count = 0 });

                var average = Math.Round(prices.Average(), 2);
                var count = prices.Count;

                // Upsert into Products cache
                if (cached == null)
                {
                    db.Products.Add(new Product
                    {
                        Upc = upc,
                        EbayAveragePrice = average,
                        EbayPriceCount = count,
                        EbayCachedAt = DateTimeOffset.UtcNow
                    });
                }
                else
                {
                    cached.EbayAveragePrice = average;
                    cached.EbayPriceCount = count;
                    cached.EbayCachedAt = DateTimeOffset.UtcNow;
                }
                await db.SaveChangesAsync();

                return Results.Ok(new { average, count });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error fetching eBay data: {ex.Message}");
            }
        });

        // Debug endpoint — returns matched prices so you can verify extraction
        group.MapGet("/debug/{upc}", async (string upc) =>
        {
            try
            {
                var html = await FetchEbayHtml(upc);
                var prices = ExtractPricesFromHtml(html);
                return Results.Ok(new
                {
                    prices,
                    count = prices.Count,
                    average = prices.Count > 0 ? Math.Round(prices.Average(), 2) : (decimal?)null
                });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error fetching eBay data: {ex.Message}");
            }
        });
    }

    // Each call gets its own cookie container so sessions are independent per request,
    // avoiding shared state across users while still looking like a real browser visit
    private static async Task<string> FetchEbayHtml(string upc)
    {
        var cookieContainer = new CookieContainer();
        var handler = new HttpClientHandler { CookieContainer = cookieContainer };
        using var httpClient = new HttpClient(handler);

        httpClient.DefaultRequestHeaders.Add("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
        httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

        var url = $"https://www.ebay.com/sch/i.html?_nkw={Uri.EscapeDataString(upc)}&LH_Sold=1&rt=nc&LH_ItemCondition=4";
        return await httpClient.GetStringAsync(url);
    }

    private static List<decimal> ExtractPricesFromHtml(string html)
    {
        var prices = new List<decimal>();
        var doc = new HtmlDocument();
        doc.LoadHtml(html);

        // Strategy 1: known eBay price class selectors
        HtmlNodeCollection? priceNodes = null;
        foreach (var cls in PriceClassSelectors)
        {
            priceNodes = doc.DocumentNode.SelectNodes($"//span[contains(@class, '{cls}')]");
            if (priceNodes != null && priceNodes.Count > 0) break;
        }

        if (priceNodes != null)
        {
            foreach (var node in priceNodes)
            {
                var text = node.InnerText.Trim();
                // Handle ranges like "$10.00 to $15.00" — take both bounds and average them in
                var parts = text.Split(" to ", StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    var clean = part.TrimStart('$', 'C', ' ').Replace(",", "").Trim();
                    if (decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) && price > 0)
                        prices.Add(price);
                }
            }
        }

        // Strategy 2: regex fallback — find all dollar amounts in raw HTML if class selectors failed
        if (prices.Count == 0)
        {
            foreach (Match m in PriceRegex.Matches(html))
            {
                var clean = m.Groups[1].Value.Replace(",", "");
                if (decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) && price > 0 && price < 10000)
                    prices.Add(price);
            }
        }

        return prices;
    }
}