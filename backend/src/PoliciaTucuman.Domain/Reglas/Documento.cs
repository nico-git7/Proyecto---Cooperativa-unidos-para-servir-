namespace PoliciaTucuman.Domain.Reglas;

public static class Documento
{
    public static string Normalizar(string? dni) =>
        new((dni ?? string.Empty).Where(char.IsDigit).ToArray());

    public static bool EsValido(string dniNormalizado) =>
        dniNormalizado.Length is >= 7 and <= 8 && dniNormalizado[0] != '0';
}
