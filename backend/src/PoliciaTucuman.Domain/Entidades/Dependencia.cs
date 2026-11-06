using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Entidades;

public class Dependencia
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public TipoDependencia Tipo { get; set; }
    public int UnidadRegionalId { get; set; }
    public UnidadRegional? UnidadRegional { get; set; }

    public string Direccion { get; set; } = string.Empty;
    public string Localidad { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }

    /// <summary>Solo las dependencias con jurisdicción territorial reciben denuncias por asignación automática.</summary>
    public bool RecibeDenuncias { get; set; } = true;
    public bool Activa { get; set; } = true;

    public bool TieneUbicacion => Latitud.HasValue && Longitud.HasValue;
}
