using System.Security.Cryptography;

namespace PoliciaTucuman.Domain.Reglas;

/// <summary>
/// Código que recibe el denunciante para consultar su trámite. Se excluyen caracteres
/// que se confunden al dictarlos o leerlos (0/O, 1/I/L).
/// </summary>
public static class CodigoSeguimiento
{
    private const string Alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private const int Largo = 8;

    public static string Generar()
    {
        Span<char> buffer = stackalloc char[Largo];
        for (var i = 0; i < Largo; i++)
            buffer[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];

        return $"{buffer[..4]}-{buffer[4..]}";
    }

    public static string Normalizar(string? codigo)
    {
        var limpio = new string((codigo ?? string.Empty)
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());

        return limpio.Length == Largo ? $"{limpio[..4]}-{limpio[4..]}" : limpio;
    }
}
