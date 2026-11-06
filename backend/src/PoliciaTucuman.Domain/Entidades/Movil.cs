using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Entidades;

public class Movil
{
    public int Id { get; set; }
    public string NumeroInterno { get; set; } = string.Empty;
    public string Dominio { get; set; } = string.Empty;
    public TipoMovil Tipo { get; set; }
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public int Anio { get; set; }
    public EstadoMovil Estado { get; set; } = EstadoMovil.Operativo;
    public int DependenciaId { get; set; }
    public Dependencia? Dependencia { get; set; }
    public int Kilometraje { get; set; }
    public string? Observaciones { get; set; }
}
