using HtmlAgilityPack;
using System.Globalization;

namespace MovieVault.Api.Endpoints;

public static class EbayEndpoints
{
    private static readonly string[] PriceClassSelectors =
    [
        "s-item__price",
        "s-card__price",
        "su-styled-text",
    ];

    public static void MapEbayEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ebay");

        group.MapGet("/sold-average/{upc}", async (string upc) =>
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
            httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

            try
            {
                var url = $"https://www.ebay.com/sch/i.html?_nkw={Uri.EscapeDataString(upc)}&LH_Sold=1&rt=nc&LH_ItemCondition=4";
                var html = await httpClient.GetStringAsync(url);

                var doc = new HtmlDocument();
                doc.LoadHtml(html);

                // Try each known eBay price class selector until we find nodes
                HtmlNodeCollection? priceNodes = null;
                foreach (var cls in PriceClassSelectors)
                {
                    priceNodes = doc.DocumentNode.SelectNodes($"//span[contains(@class, '{cls}')]");
                    if (priceNodes != null && priceNodes.Count > 0) break;
                }

                if (priceNodes == null || priceNodes.Count == 0)
                    return Results.Ok(new { average = (decimal?)null, count = 0 });

                var prices = new List<decimal>();
                foreach (var node in priceNodes)
                {
                    var text = node.InnerText.Trim();
                    // Handle ranges like "$10.00 to $15.00" — take the lower bound
                    var parts = text.Split(" to ", StringSplitOptions.RemoveEmptyEntries);
                    foreach (var part in parts)
                    {
                        var clean = part.TrimStart('$', 'C', ' ').Replace(",", "").Trim();
                        if (decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) && price > 0)
                            prices.Add(price);
                    }
                }

                if (prices.Count == 0)
                    return Results.Ok(new { average = (decimal?)null, count = 0 });

                var average = Math.Round(prices.Average(), 2);
                return Results.Ok(new { average, count = prices.Count });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error fetching eBay data: {ex.Message}");
            }
        });

        // Debug endpoint — returns raw eBay HTML so you can inspect what's being returned
        group.MapGet("/debug/{upc}", async (string upc) =>
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");

            var url = $"https://www.ebay.com/sch/i.html?_nkw={Uri.EscapeDataString(upc)}&LH_Sold=1&rt=nc&LH_ItemCondition=4";
            var html = await httpClient.GetStringAsync(url);
            return Results.Content(html, "text/html");
        });
    }
}
