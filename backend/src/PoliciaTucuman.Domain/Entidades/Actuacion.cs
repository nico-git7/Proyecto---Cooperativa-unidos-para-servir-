using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Entidades;

/// <summary>
/// Registro de cada movimiento del expediente. <see cref="DescripcionPublica"/> es lo único que ve
/// el denunciante en la consulta online; si es null, la actuación es interna.
/// </summary>
public class Actuacion
{
    public int Id { get; set; }
    public int DenunciaId { get; set; }
    public TipoActuacion Tipo { get; set; }
    public DateTimeOffset Fecha { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string? DescripcionPublica { get; set; }
    public EstadoDenuncia? EstadoAnterior { get; set; }
    public EstadoDenuncia? EstadoNuevo { get; set; }
    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public bool EsPublica => DescripcionPublica is not null;
}
