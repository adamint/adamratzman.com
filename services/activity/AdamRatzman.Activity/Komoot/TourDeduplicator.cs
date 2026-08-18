namespace AdamRatzman.Activity.Komoot;

public static class TourDeduplicator
{
    /// <summary>
    /// Drops tours whose activity period overlaps one already kept (Komoot records the same ride
    /// twice when two devices are running), then sorts newest-first.
    /// Input order is significant and must be arrival order - it decides which of a pair survives.
    /// </summary>
    public static IReadOnlyList<KomootTour> Deduplicate(IReadOnlyList<KomootTour> tours)
    {
        var kept = new List<KomootTour>(tours.Count);

        foreach (var tour in tours)
        {
            var start = tour.Date;
            var end = start.AddSeconds(tour.Duration);

            var overlaps = kept.Any(other =>
                other.Id != tour.Id &&
                start <= other.Date.AddSeconds(other.Duration) &&
                other.Date <= end);

            if (!overlaps) kept.Add(tour);
        }

        return kept.OrderByDescending(t => t.Date.ToUnixTimeSeconds()).ToList();
    }
}
