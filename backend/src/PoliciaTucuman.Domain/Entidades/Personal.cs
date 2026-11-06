using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Entidades;

public class Personal
{
    public int Id { get; set; }
    public string Legajo { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Dni { get; set; } = string.Empty;
    public Jerarquia Jerarquia { get; set; }
    public SituacionRevista Situacion { get; set; } = SituacionRevista.ServicioEfectivo;
    public int DependenciaId { get; set; }
    public Dependencia? Dependencia { get; set; }
    public string? Email { get; set; }
    public string? Telefono { get; set; }
    public DateOnly FechaIngreso { get; set; }

    public Usuario? Usuario { get; set; }

    public string NombreCompleto => $"{Apellido}, {Nombre}";

    public bool EsOficial => Jerarquia >= Jerarquia.OficialAyudante;

    public bool PuedeInstruir => Situacion == SituacionRevista.ServicioEfectivo;
}
