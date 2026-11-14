using System.Net;
using System.Net.Sockets;

namespace Kinodex.Api.Services;

// Keeps requests to user-typed addresses (a Jellyfin server) off private networks. Without it,
// anyone signed in could make this server fetch addresses inside Railway's network, or the cloud
// metadata service. The check runs when each connection is opened, on the address actually
// connected to, so a hostname that resolves somewhere public on one lookup and inside the next
// can't slip through, and neither can a redirect.
public static class PublicAddress
{
    // Thrown (inside the HttpRequestException) when every address a host resolves to is private
    public class BlockedException(string host) : Exception($"{host} isn't a public address.");

    public static bool IsPublic(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            return !(
                b[0] == 0 ||                                   // "this network"
                b[0] == 10 ||                                  // private
                b[0] == 127 ||                                 // loopback
                (b[0] == 100 && b[1] >= 64 && b[1] <= 127) ||  // carrier-grade NAT
                (b[0] == 169 && b[1] == 254) ||                // link-local, cloud metadata
                (b[0] == 172 && b[1] >= 16 && b[1] <= 31) ||   // private
                (b[0] == 192 && b[1] == 0 && b[2] == 0) ||     // protocol assignments
                (b[0] == 192 && b[1] == 168) ||                // private
                (b[0] == 198 && (b[1] == 18 || b[1] == 19)) || // benchmarking
                b[0] >= 224);                                  // multicast, reserved, broadcast
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            var first = address.GetAddressBytes()[0];
            return !(
                IPAddress.IPv6Loopback.Equals(address) ||
                IPAddress.IPv6None.Equals(address) || // ::
                address.IsIPv6LinkLocal ||
                address.IsIPv6SiteLocal ||
                address.IsIPv6Multicast ||
                (first & 0xFE) == 0xFC); // unique local (fc00::/7), e.g. Railway's private network
        }

        return false;
    }

    // An HttpClient handler whose connections only go to public addresses (or anywhere, when
    // private addresses are allowed: local development, for a Jellyfin on the home network)
    public static SocketsHttpHandler Handler(bool allowPrivate) => new()
    {
        ConnectCallback = async (context, cancellationToken) =>
        {
            var host = context.DnsEndPoint.Host;
            var addresses = await Dns.GetHostAddressesAsync(host, cancellationToken);
            var allowed = allowPrivate ? addresses : addresses.Where(IsPublic).ToArray();
            if (allowed.Length == 0) throw new BlockedException(host);

            var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
            try
            {
                await socket.ConnectAsync(allowed, context.DnsEndPoint.Port, cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        },
    };
}
