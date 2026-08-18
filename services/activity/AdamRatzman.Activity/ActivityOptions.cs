namespace AdamRatzman.Activity;

public sealed class ActivityOptions
{
    public const string SectionName = "Activity";

    public string KomootEmail { get; set; } = "";
    public string KomootPassword { get; set; } = "";

    public string AccountApiBaseUrl { get; set; } = "https://api.komoot.de/v006";
    public string TourApiBaseUrl { get; set; } = "https://api.komoot.de/v007";

    public TimeSpan RefreshInterval { get; set; } = TimeSpan.FromMinutes(60);

    /// <summary>
    /// IANA id. Defaults to UTC because the Kotlin service used the container's system default,
    /// which was UTC. Changing this reassigns tours near midnight to different days and weeks.
    /// </summary>
    public string TimeZone { get; set; } = "UTC";

    public int MaxPages { get; set; } = 200;

    public TimeZoneInfo ResolveTimeZone() =>
        string.IsNullOrWhiteSpace(TimeZone) ? TimeZoneInfo.Utc : TimeZoneInfo.FindSystemTimeZoneById(TimeZone);
}
