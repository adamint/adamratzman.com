namespace AdamRatzman.Activity.Contract;

public enum SportType
{
    Biking,
    EBiking,
    Running,
    Hiking,
    Other
}

// Member names are wire values: they are serialized verbatim as bicycleInfo.name.
// Do not rename them to satisfy an analyzer.
#pragma warning disable CA1707 // Identifiers should not contain underscores
public enum BikeType
{
    Propella_7S,
    Specialized_Turbo_Vado,
    Cervelo_SLC_SL,
    REI_CO_OP_GENERATION_E
}
#pragma warning restore CA1707

public static class BikeTypes
{
    public static BikeType FromTourName(string tourName) => tourName switch
    {
        _ when tourName.EndsWith("(P)", StringComparison.Ordinal) => BikeType.Propella_7S,
        _ when tourName.EndsWith("(R)", StringComparison.Ordinal) => BikeType.Cervelo_SLC_SL,
        _ when tourName.EndsWith("(C)", StringComparison.Ordinal) => BikeType.REI_CO_OP_GENERATION_E,
        _ => BikeType.Specialized_Turbo_Vado
    };

    public static bool IsElectric(this BikeType bike) => bike != BikeType.Cervelo_SLC_SL;
}

public static class SportTypes
{
    /// <summary>
    /// Port of Kotlin <c>String.toKomootSportType</c>. The substring test, the "(R)" rule, and the
    /// fact that "hike" falls through to Other are all intentional — see the plan's Task 2 notes.
    /// </summary>
    public static SportType FromKomoot(string komootSport, string tourName)
    {
        if (komootSport.Contains("bike", StringComparison.Ordinal) ||
            komootSport.Contains("bicycle", StringComparison.Ordinal))
        {
            return tourName.EndsWith("(R)", StringComparison.Ordinal) ? SportType.Biking : SportType.EBiking;
        }

        if (komootSport is "jogging" or "running") return SportType.Running;
        if (komootSport is "hiking") return SportType.Hiking;
        return SportType.Other;
    }
}
