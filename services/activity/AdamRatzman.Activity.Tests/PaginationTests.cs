using AdamRatzman.Activity.Contract;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class PaginationTests
{
    private static readonly int[] Ten = Enumerable.Range(0, 10).ToArray();

    [Theory]
    [InlineData(0, 5, 10, false)]
    [InlineData(9, 5, 10, false)]
    [InlineData(10, 5, 10, true)]   // offset >= total
    [InlineData(11, 5, 10, true)]
    [InlineData(-1, 5, 10, true)]   // negative offset
    [InlineData(0, 0, 10, true)]    // limit <= 0
    [InlineData(0, -3, 10, true)]
    [InlineData(0, 5, 0, true)]     // empty dataset: every offset is >= total
    public void MatchesKotlinValidityRule(int offset, int limit, int total, bool invalid)
    {
        Paginator.IsInvalid(offset, limit, total).Should().Be(invalid);
    }

    [Fact]
    public void ReturnsTheRequestedWindow()
    {
        var page = Paginator.Paginate(Ten, 2, 3)!;

        page.Data.Should().Equal(2, 3, 4);
        page.Total.Should().Be(10);
        page.Next.Should().Be(new PaginationRequest(5, 3));
        page.Previous.Should().BeNull();
    }

    [Fact]
    public void PreviousIsNullAtTheStart()
    {
        Paginator.Paginate(Ten, 0, 3)!.Previous.Should().BeNull();
    }

    [Fact]
    public void NextIsNullAtTheEnd()
    {
        Paginator.Paginate(Ten, 8, 3)!.Next.Should().BeNull();
    }

    [Fact]
    public void ClampsAWindowThatRunsOffTheEnd()
    {
        // The Kotlin threw IndexOutOfBoundsException here and returned 500.
        var page = Paginator.Paginate(Ten, 8, 1000)!;

        page.Data.Should().Equal(8, 9);
        page.Total.Should().Be(10);
        page.Next.Should().BeNull();
    }

    [Fact]
    public void ReturnsNullForAnInvalidRequest()
    {
        Paginator.Paginate(Ten, 10, 3).Should().BeNull();
        Paginator.Paginate(Ten, -1, 3).Should().BeNull();
        Paginator.Paginate(Ten, 0, 0).Should().BeNull();
    }

    [Fact]
    public void ReturnsNullForAnEmptyDataset()
    {
        Paginator.Paginate(Array.Empty<int>(), 0, 5).Should().BeNull();
    }
}
