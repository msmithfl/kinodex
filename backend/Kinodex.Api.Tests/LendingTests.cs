using System.Net;
using System.Net.Http.Json;
using Kinodex.Api.Tests.Infrastructure;

namespace Kinodex.Api.Tests;

// Lending is parked, but its endpoints are live, so they must keep users apart too
[Collection(ApiCollection.Name)]
public class LendingTests(KinodexApiFactory api)
{
    private static async Task<int> CreateCustomerAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/customers", new { name, email = "", phone = "" });
        response.EnsureSuccessStatusCode();
        return (await response.ReadJsonAsync()).GetProperty("id").GetInt32();
    }

    [Fact]
    public async Task Users_only_see_their_own_customers()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        var aliceCustomer = await CreateCustomerAsync(alice, "Alice's friend");

        Assert.Empty((await bob.GetJsonAsync("/api/customers")).EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/customers/{aliceCustomer}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"/api/customers/{aliceCustomer}")).StatusCode);
    }

    [Fact]
    public async Task Checkouts_need_your_own_movie_and_customer()
    {
        var alice = api.ClientFor(KinodexApiFactory.NewUserId());
        var bob = api.ClientFor(KinodexApiFactory.NewUserId());
        var aliceMovie = await alice.CreateMovieAsync("Lendable");
        var aliceCustomer = await CreateCustomerAsync(alice, "Borrower");
        var bobCustomer = await CreateCustomerAsync(bob, "Bob's borrower");

        // Bob can't lend Alice's movie, and Alice can't lend to Bob's customer
        var bobTries = await bob.PostAsJsonAsync("/api/checkouts", new { movieId = aliceMovie, customerId = bobCustomer });
        var aliceToBobs = await alice.PostAsJsonAsync("/api/checkouts", new { movieId = aliceMovie, customerId = bobCustomer });
        var aliceOwn = await alice.PostAsJsonAsync("/api/checkouts", new { movieId = aliceMovie, customerId = aliceCustomer });

        Assert.Equal(HttpStatusCode.BadRequest, bobTries.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, aliceToBobs.StatusCode);
        Assert.Equal(HttpStatusCode.Created, aliceOwn.StatusCode);
        Assert.Single((await alice.GetJsonAsync("/api/checkouts")).EnumerateArray());
        Assert.Empty((await bob.GetJsonAsync("/api/checkouts")).EnumerateArray());
    }
}
