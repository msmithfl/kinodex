using System.Net;
using Kinodex.Api.Services;
using static Kinodex.Api.Services.JellyfinCompare;

namespace Kinodex.Api.Tests;

// The Jellyfin matching rules and the public-address check, on their own (no API or database)
public class JellyfinCompareTests
{
    private static LibraryComparison CompareOne(KinodexTitle kinodex, JellyfinTitle jellyfin) =>
        Compare([kinodex], [jellyfin]);

    [Fact]
    public void Titles_match_without_articles_case_punctuation_or_accents_and_a_year_apart()
    {
        var result = CompareOne(
            new KinodexTitle(1, "Lord of the Rings: The Fellowship of the Ring", 2001, null),
            new JellyfinTitle("j", "The Lord of the Rings - the Fellowship of the Ring", 2002, 120));

        Assert.Equal("title", Assert.Single(result.InBoth).MatchedBy);

        Assert.Single(CompareOne(new KinodexTitle(1, "Amélie", 2001, null), new JellyfinTitle("j", "Amelie", 2001, null)).InBoth);
        Assert.Single(CompareOne(new KinodexTitle(1, "Schindler's List", 1993, null), new JellyfinTitle("j", "Schindlers List", 1993, null)).InBoth);
    }

    [Fact]
    public void Same_title_years_apart_or_with_different_tmdb_ids_are_different_films()
    {
        // A remake: same title, decades apart
        var remake = CompareOne(new KinodexTitle(1, "The Thing", 1982, null), new JellyfinTitle("j", "The Thing", 2011, null));
        Assert.Empty(remake.InBoth);
        Assert.Single(remake.OnlyInKinodex);
        Assert.Single(remake.OnlyOnJellyfin);

        // Both sides know their TMDB ids, and they differ
        var different = CompareOne(new KinodexTitle(1, "Heat", 1995, 949), new JellyfinTitle("j", "Heat", 1995, 12345));
        Assert.Empty(different.InBoth);
    }

    [Fact]
    public void An_unknown_year_matches_any_and_a_tmdb_match_needs_no_title()
    {
        Assert.Single(CompareOne(new KinodexTitle(1, "Alien", 0, null), new JellyfinTitle("j", "Alien", 1979, null)).InBoth);

        var renamed = CompareOne(new KinodexTitle(1, "Alien (Director's Cut)", 1979, 348), new JellyfinTitle("j", "Alien", 1979, 348));
        Assert.Equal("tmdb", Assert.Single(renamed.InBoth).MatchedBy);
    }

    [Fact]
    public void Two_kinodex_copies_both_match_one_jellyfin_file()
    {
        var result = Compare(
            [new KinodexTitle(1, "Alien", 1979, 348), new KinodexTitle(2, "Alien", 1979, 348)],
            [new JellyfinTitle("j", "Alien", 1979, 348)]);

        Assert.Equal(2, result.InBoth.Count);
        Assert.Empty(result.OnlyOnJellyfin);
    }

    [Fact]
    public void Every_jellyfin_copy_of_a_film_in_kinodex_counts_as_in_kinodex()
    {
        // The same film twice on the server (a 4K and an HD library), once by TMDB id and once
        // only by title
        var result = Compare(
            [new KinodexTitle(1, "1941", 1979, 11519)],
            [
                new JellyfinTitle("4k", "1941", 1979, 11519),
                new JellyfinTitle("hd", "1941", 1979, 11519),
                new JellyfinTitle("old", "1941", 1979, null),
            ]);

        Assert.Empty(result.OnlyOnJellyfin);
        Assert.Single(result.InBoth);
    }

    [Fact]
    public void A_film_missing_from_kinodex_is_listed_once_however_many_copies_jellyfin_has()
    {
        var result = Compare([],
        [
            new JellyfinTitle("4k", "Jaws", 1975, 578),
            new JellyfinTitle("hd", "Jaws", 1975, 578),
            new JellyfinTitle("a", "Duel", 1971, null),
            new JellyfinTitle("b", "Duel", 1971, null),
        ]);

        Assert.Equal(["Duel", "Jaws"], result.OnlyOnJellyfin.Select(j => j.Title));
    }

    [Fact]
    public void Lists_come_back_in_title_order_ignoring_articles()
    {
        var result = Compare([],
        [
            new JellyfinTitle("1", "The Thing", 1982, null),
            new JellyfinTitle("2", "Blade Runner", 1982, null),
            new JellyfinTitle("3", "A Quiet Place", 2018, null),
        ]);

        Assert.Equal(["Blade Runner", "A Quiet Place", "The Thing"], result.OnlyOnJellyfin.Select(j => j.Title));
    }

    [Theory]
    [InlineData("8.8.8.8", true)]
    [InlineData("2606:4700:4700::1111", true)]
    [InlineData("10.0.0.5", false)]
    [InlineData("172.20.1.1", false)]
    [InlineData("192.168.1.10", false)]
    [InlineData("127.0.0.1", false)]
    [InlineData("169.254.169.254", false)] // Cloud metadata
    [InlineData("100.64.0.1", false)]
    [InlineData("0.0.0.0", false)]
    [InlineData("::1", false)]
    [InlineData("fd12:3456::1", false)] // Unique local, like Railway's private network
    [InlineData("fe80::1", false)]
    [InlineData("::ffff:192.168.1.10", false)] // IPv4 inside IPv6
    public void Only_public_addresses_count_as_public(string address, bool isPublic)
    {
        Assert.Equal(isPublic, PublicAddress.IsPublic(IPAddress.Parse(address)));
    }
}
