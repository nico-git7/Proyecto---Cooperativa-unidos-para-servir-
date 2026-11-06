using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Infrastructure.Seguridad;

public interface IHasherPasswords
{
    string Hashear(string password);
    bool Verificar(Usuario usuario, string password);
    string GenerarTemporal();
}

/// <summary>PBKDF2 (HMAC-SHA512, 100.000 iteraciones) a través del hasher de ASP.NET Core Identity.</summary>
internal sealed class HasherPasswords : IHasherPasswords
{
    private readonly PasswordHasher<Usuario> _hasher = new();

    public string Hashear(string password) => _hasher.HashPassword(null!, password);

    public bool Verificar(Usuario usuario, string password) =>
        _hasher.VerifyHashedPassword(usuario, usuario.PasswordHash, password) != PasswordVerificationResult.Failed;

    public string GenerarTemporal()
    {
        const string letras = "abcdefghjkmnpqrstuvwxyz";
        const string digitos = "23456789";
        var sb = new StringBuilder();
        for (var i = 0; i < 6; i++) sb.Append(letras[RandomNumberGenerator.GetInt32(letras.Length)]);
        for (var i = 0; i < 4; i++) sb.Append(digitos[RandomNumberGenerator.GetInt32(digitos.Length)]);
        sb[0] = char.ToUpperInvariant(sb[0]);
        return sb.ToString();
    }
}

public static class TokensSeguros
{
    public static string Generar() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
}
