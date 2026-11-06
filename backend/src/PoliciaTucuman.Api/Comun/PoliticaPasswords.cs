using PoliciaTucuman.Domain.Comun;

namespace PoliciaTucuman.Api.Comun;

public static class PoliticaPasswords
{
    public const int LargoMinimo = 8;

    public static void Validar(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < LargoMinimo)
            throw new ReglaNegocioException($"La contraseña debe tener al menos {LargoMinimo} caracteres.");

        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            throw new ReglaNegocioException("La contraseña debe combinar letras y números.");
    }
}
