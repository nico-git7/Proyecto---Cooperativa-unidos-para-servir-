namespace PoliciaTucuman.Domain.Entidades;

public class Adjunto
{
    public int Id { get; set; }
    public int DenunciaId { get; set; }
    public string NombreOriginal { get; set; } = string.Empty;
    public string Ruta { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long TamanoBytes { get; set; }
    public DateTimeOffset SubidoEn { get; set; }
    public int? SubidoPorUsuarioId { get; set; }

    public bool EsImagen => ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
}
