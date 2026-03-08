namespace Kinodex.Api.Endpoints;

public static class UpcEndpoints
{
    public static void MapUpcEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/upc");

        group.MapGet("/lookup/{upc}", async (string upc, HttpContext context) =>
        {
            using var httpClient = new HttpClient();
            
            try
            {
                var response = await httpClient.GetAsync($"https://api.upcitemdb.com/prod/trial/lookup?upc={upc}");
                
                // Forward the rate limit headers to the client
                foreach (var header in new[] { "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset" })
                {
                    if (response.Headers.TryGetValues(header, out var values))
                    {
                        context.Response.Headers[header] = values.FirstOrDefault();
                    }
                }
                
                var content = await response.Content.ReadAsStringAsync();
                
                return Results.Content(content, "application/json", statusCode: (int)response.StatusCode);
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error fetching UPC data: {ex.Message}");
            }
        });
    }
}
