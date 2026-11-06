namespace PoliciaTucuman.Infrastructure.Almacenamiento;

/// <summary>
/// Identifica el tipo real del archivo por su firma (magic bytes). No se confía en la extensión
/// ni en el Content-Type que manda el navegador.
/// </summary>
public static class TiposArchivo
{
    public sealed record Tipo(string ContentType, string Extension);

    public static readonly Tipo Jpeg = new("image/jpeg", ".jpg");
    public static readonly Tipo Png = new("image/png", ".png");
    public static readonly Tipo Webp = new("image/webp", ".webp");
    public static readonly Tipo Pdf = new("application/pdf", ".pdf");

    public const string Aceptados = "JPG, PNG, WEBP o PDF";

    public static Tipo? Detectar(ReadOnlySpan<byte> cabecera)
    {
        if (cabecera.Length >= 3 && cabecera[0] == 0xFF && cabecera[1] == 0xD8 && cabecera[2] == 0xFF)
            return Jpeg;

        if (cabecera.Length >= 8 && cabecera[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return Png;

        if (cabecera.Length >= 12 && cabecera[..4].SequenceEqual("RIFF"u8) && cabecera[8..12].SequenceEqual("WEBP"u8))
            return Webp;

        if (cabecera.Length >= 5 && cabecera[..5].SequenceEqual("%PDF-"u8))
            return Pdf;

        return null;
    }
}
