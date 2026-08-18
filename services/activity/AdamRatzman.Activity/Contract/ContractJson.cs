using System.Text.Json;
using System.Text.Json.Serialization;

namespace AdamRatzman.Activity.Contract;

/// <summary>
/// Settings for *writing* our public responses. These reproduce kotlinx.serialization's output
/// byte-for-byte (modulo whole-number float formatting). See the plan's Task 4 table before
/// changing anything here — every setting is load-bearing.
/// </summary>
public static class ContractJson
{
    public static readonly JsonSerializerOptions Options = Create();

    public static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            // kotlinx has no DictionaryKeyPolicy equivalent; keys are written verbatim.
            DictionaryKeyPolicy = null,
            // bicycleInfo has no Kotlin default, so it is always written - including as null.
            // The two pagination links opt out individually via [JsonIgnore].
            DefaultIgnoreCondition = JsonIgnoreCondition.Never,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        // No naming policy: "EBiking" must not become "eBiking".
        options.Converters.Add(new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false));
        return options;
    }
}
