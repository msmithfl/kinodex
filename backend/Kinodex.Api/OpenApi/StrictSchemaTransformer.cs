using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Kinodex.Api.OpenApi;

// Tightens the generated OpenAPI description so the frontend's generated TypeScript types match
// what the API actually sends. It only changes the description, never how requests are handled.
//
// - Numbers: ASP.NET's web JSON defaults also accept numbers written as strings, so the default
//   description says "integer or string". The API always *sends* numbers, so describe them as
//   numbers only (requests may still send strings, exactly as before).
// - Required: properties the API always includes are marked required. Only nullable ones (e.g. an
//   int? TMDB id) and references to other objects are left optional.
public sealed class StrictSchemaTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken cancellationToken)
    {
        RemoveStringFromNumbers(schema);

        if (schema.Properties is { Count: > 0 })
        {
            schema.Required ??= new HashSet<string>();
            foreach (var (name, property) in schema.Properties)
            {
                if (property is OpenApiSchema concrete)
                {
                    RemoveStringFromNumbers(concrete);
                    if (concrete.Type is { } type && !type.HasFlag(JsonSchemaType.Null))
                        schema.Required.Add(name);
                }
            }
        }

        return Task.CompletedTask;
    }

    private static void RemoveStringFromNumbers(OpenApiSchema schema)
    {
        if (schema.Type is not { } type) return;
        var isNumeric = type.HasFlag(JsonSchemaType.Integer) || type.HasFlag(JsonSchemaType.Number);
        if (isNumeric && type.HasFlag(JsonSchemaType.String))
        {
            schema.Type = type & ~JsonSchemaType.String;
            schema.Pattern = null; // The "digits as a string" pattern no longer applies
        }
    }
}
