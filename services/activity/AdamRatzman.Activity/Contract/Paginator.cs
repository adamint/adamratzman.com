namespace AdamRatzman.Activity.Contract;

public static class Paginator
{
    /// <summary>Port of Kotlin <c>isInvalidOffsetAndLimit</c>.</summary>
    public static bool IsInvalid(int offset, int limit, int total) =>
        offset >= total || limit <= 0 || offset < 0;

    /// <summary>
    /// Returns null when the request is invalid; the caller turns that into a 400,
    /// matching the Kotlin's <c>receivePaginationApiCall</c> returning null.
    /// </summary>
    public static PaginationResponse<IReadOnlyList<T>>? Paginate<T>(IReadOnlyList<T> source, int offset, int limit)
    {
        var total = source.Count;
        if (IsInvalid(offset, limit, total)) return null;

        // The Kotlin called subList(offset, offset + limit) unguarded and 500'd when
        // offset + limit exceeded the size. Clamp instead.
        var end = Math.Min(offset + (long)limit, total);
        var window = new List<T>((int)(end - offset));
        for (var i = offset; i < end; i++) window.Add(source[i]);

        var nextOffset = offset + limit;
        var previousOffset = offset - limit;

        return new PaginationResponse<IReadOnlyList<T>>(
            window,
            total,
            IsInvalid(nextOffset, limit, total) ? null : new PaginationRequest(nextOffset, limit),
            IsInvalid(previousOffset, limit, total) ? null : new PaginationRequest(previousOffset, limit));
    }
}
