namespace PoliciaTucuman.Domain.Entidades;

public class RegistroAuditoria
{
    public long Id { get; set; }
    public DateTimeOffset Fecha { get; set; }
    public int? UsuarioId { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public string? EntidadId { get; set; }
    public string? Detalle { get; set; }
    public string? Ip { get; set; }
}
