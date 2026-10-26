using System.Text.Json.Nodes;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

// The frontend's TypeScript types are generated from the API's OpenAPI description, and the
// generator keeps a copy of the description it used (frontend/.../src/types/openapi.json). If a
// backend model changes without regenerating, the frontend's types are out of date: this fails.
[Collection(ApiCollection.Name)]
public class GeneratedTypesTests(KinodexApiFactory api)
{
    [Fact]
    public async Task Frontend_types_were_generated_from_the_current_api()
    {
        var client = api.ClientFor(null);
        var current = JsonNode.Parse(await client.GetStringAsync("/openapi/v1.json"))!.AsObject();
        current.Remove("servers"); // The address the API runs on; the generator drops it too

        var snapshotPath = FindSnapshot();
        var snapshot = JsonNode.Parse(await File.ReadAllTextAsync(snapshotPath));

        Assert.True(JsonNode.DeepEquals(current, snapshot),
            "The API's OpenAPI description has changed since the frontend's types were generated. " +
            "Run the API, then `npm run gen:api` in frontend/Kinodex.Client, and commit the result.");
    }

    // Walk up from the test output folder to the repository root
    private static string FindSnapshot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var path = Path.Combine(dir.FullName, "frontend", "Kinodex.Client", "src", "types", "openapi.json");
            if (File.Exists(path)) return path;
        }
        throw new FileNotFoundException(
            "frontend/Kinodex.Client/src/types/openapi.json not found. Run `npm run gen:api` in frontend/Kinodex.Client.");
    }
}
