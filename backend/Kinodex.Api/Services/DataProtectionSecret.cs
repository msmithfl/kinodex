using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.XmlEncryption;

namespace Kinodex.Api.Services;

// Locks Data Protection's own keys (kept in the database, DataProtectionKeys) with a secret that
// isn't in the database: the DATA_PROTECTION_SECRET setting. Data Protection encrypts the saved
// Jellyfin API keys; without this, anyone with the whole database had what's needed to decrypt
// them. With it, the database alone is useless. (docs/design/jellyfin-compare.md)
//
// Any long random value works, e.g. node -e "console.log(require('crypto').randomBytes(48).toString('base64'))".
// Changing or losing it makes the saved Jellyfin keys unreadable: users connect again.
public class DataProtectionSecret
{
    public const string SettingName = "DATA_PROTECTION_SECRET";
    public const int MinimumLength = 32;

    // The AES key derived from the setting, or null when it isn't set (or is too short to trust)
    public byte[]? Key { get; }

    public bool IsSet => Key is not null;

    public DataProtectionSecret(string? value)
    {
        if (value is { Length: >= MinimumLength })
            Key = SHA256.HashData(Encoding.UTF8.GetBytes(value));
    }
}

// Encrypts each Data Protection key before it's saved: AES-GCM, nonce and tag stored with it
public class SecretXmlEncryptor(byte[] key) : IXmlEncryptor
{
    public EncryptedXmlInfo Encrypt(XElement plaintextElement)
    {
        var plaintext = Encoding.UTF8.GetBytes(plaintextElement.ToString(SaveOptions.DisableFormatting));
        var nonce = RandomNumberGenerator.GetBytes(AesGcm.NonceByteSizes.MaxSize);
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];
        var ciphertext = new byte[plaintext.Length];
        using (var aes = new AesGcm(key, tag.Length))
            aes.Encrypt(nonce, plaintext, ciphertext, tag);

        var element = new XElement("encryptedKey",
            new XComment(" Encrypted with the DATA_PROTECTION_SECRET setting "),
            new XElement("value", Convert.ToBase64String([.. nonce, .. tag, .. ciphertext])));
        return new EncryptedXmlInfo(element, typeof(SecretXmlDecryptor));
    }
}

// Data Protection creates this itself (by type name) when it reads a saved key
public class SecretXmlDecryptor(IServiceProvider services) : IXmlDecryptor
{
    public XElement Decrypt(XElement encryptedElement)
    {
        var key = services.GetRequiredService<DataProtectionSecret>().Key
            ?? throw new CryptographicException($"{DataProtectionSecret.SettingName} isn't set, so the saved keys can't be read.");

        var blob = Convert.FromBase64String(encryptedElement.Element("value")?.Value
            ?? throw new CryptographicException("The saved key is missing its value."));
        var nonceSize = AesGcm.NonceByteSizes.MaxSize;
        var tagSize = AesGcm.TagByteSizes.MaxSize;
        if (blob.Length < nonceSize + tagSize) throw new CryptographicException("The saved key is too short.");

        var nonce = blob.AsSpan(0, nonceSize);
        var tag = blob.AsSpan(nonceSize, tagSize);
        var ciphertext = blob.AsSpan(nonceSize + tagSize);
        var plaintext = new byte[ciphertext.Length];
        using (var aes = new AesGcm(key, tagSize))
            aes.Decrypt(nonce, ciphertext, tag, plaintext); // Throws if the secret is wrong or the key was altered

        return XElement.Parse(Encoding.UTF8.GetString(plaintext));
    }
}
