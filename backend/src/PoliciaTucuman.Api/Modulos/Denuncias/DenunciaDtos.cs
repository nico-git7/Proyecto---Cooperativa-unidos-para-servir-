using System.ComponentModel.DataAnnotations;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Api.Modulos.Denuncias;

public sealed class DenuncianteForm
{
    [Required(ErrorMessage = "Ingresá el nombre.")]
    [StringLength(80, ErrorMessage = "El nombre es demasiado largo.")]
    public string Nombre { get; set; } = string.Empty;

    [Required(ErrorMessage = "Ingresá el apellido.")]
    [StringLength(80, ErrorMessage = "El apellido es demasiado largo.")]
    public string Apellido { get; set; } = string.Empty;

    [Required(ErrorMessage = "Ingresá el DNI.")]
    [RegularExpression(@"^[\d\.\s]{7,11}$", ErrorMessage = "El DNI no es válido.")]
    public string Dni { get; set; } = string.Empty;

    public DateOnly? FechaNacimiento { get; set; }

    [StringLength(40)]
    public string? Telefono { get; set; }

    [EmailAddress(ErrorMessage = "El correo electrónico no es válido.")]
    [StringLength(120)]
    public string? Email { get; set; }

    [Required(ErrorMessage = "Ingresá el domicilio.")]
    [StringLength(160)]
    public string Domicilio { get; set; } = string.Empty;

    [Required(ErrorMessage = "Ingresá la localidad.")]
    [StringLength(80)]
    public string Localidad { get; set; } = string.Empty;
}

/// <summary>Alta de denuncia. Llega como multipart/form-data para poder incluir los adjuntos.</summary>
public sealed class NuevaDenunciaForm
{
    [Required(ErrorMessage = "Seleccioná el tipo de hecho.")]
    public TipoDelito? Tipo { get; set; }

    [Required(ErrorMessage = "Indicá la fecha y hora del hecho.")]
    public DateTimeOffset? FechaHecho { get; set; }

    [Required(ErrorMessage = "Indicá el lugar del hecho.")]
    [StringLength(200)]
    public string LugarHecho { get; set; } = string.Empty;

    [Required(ErrorMessage = "Indicá la localidad del hecho.")]
    [StringLength(80)]
    public string Localidad { get; set; } = string.Empty;

    [Range(-90, 90)]
    public double? Latitud { get; set; }

    [Range(-180, 180)]
    public double? Longitud { get; set; }

    [Required(ErrorMessage = "Contá cómo ocurrió el hecho.")]
    [StringLength(8000, MinimumLength = 30, ErrorMessage = "El relato debe tener entre 30 y 8000 caracteres.")]
    public string Relato { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? BienesInvolucrados { get; set; }

    [Required]
    public DenuncianteForm Denunciante { get; set; } = new();

    public bool DeclaracionJurada { get; set; }

    /// <summary>Solo para altas presenciales: dependencia donde se recibe la denuncia.</summary>
    public int? DependenciaId { get; set; }

    public List<IFormFile> Adjuntos { get; set; } = [];
}

public sealed record DependenciaContactoDto(int Id, string Nombre, string Direccion, string Localidad, string? Telefono);

public sealed record ComprobanteDenunciaDto(
    int Id,
    string Numero,
    string CodigoSeguimiento,
    DateTimeOffset Fecha,
    TipoDelito Tipo,
    string Denunciante,
    DependenciaContactoDto? Dependencia,
    bool CorreoEnviado,
    int Adjuntos);

public sealed record FiltroDenuncias : ParametrosPagina
{
    public string? Texto { get; init; }
    public EstadoDenuncia? Estado { get; init; }
    public TipoDelito? Tipo { get; init; }
    public Prioridad? Prioridad { get; init; }
    public OrigenDenuncia? Origen { get; init; }
    public int? DependenciaId { get; init; }
    public int? UnidadRegionalId { get; init; }
    public DateOnly? Desde { get; init; }
    public DateOnly? Hasta { get; init; }
    public bool SoloAbiertas { get; init; }
    public bool SinInstructor { get; init; }
    public bool Mias { get; init; }
}

public sealed record DenunciaItemDto(
    int Id,
    string Numero,
    TipoDelito Tipo,
    EstadoDenuncia Estado,
    Prioridad Prioridad,
    OrigenDenuncia Origen,
    string Denunciante,
    string Dni,
    string LugarHecho,
    string Localidad,
    DateTimeOffset FechaHecho,
    DateTimeOffset CreadaEn,
    string? Dependencia,
    string? Instructor);

public sealed record DenuncianteDetalleDto(
    string Nombre, string Apellido, string Dni, DateOnly? FechaNacimiento,
    string? Telefono, string? Email, string Domicilio, string Localidad);

public sealed record PersonaRefDto(int Id, string Legajo, string Nombre, Jerarquia Jerarquia);

public sealed record ActuacionDto(
    int Id,
    TipoActuacion Tipo,
    DateTimeOffset Fecha,
    string Descripcion,
    bool InformadaAlDenunciante,
    EstadoDenuncia? EstadoAnterior,
    EstadoDenuncia? EstadoNuevo,
    string? Usuario);

public sealed record AdjuntoDto(int Id, string Nombre, string ContentType, long TamanoBytes, DateTimeOffset SubidoEn, bool AportadoPorDenunciante);

public sealed record PermisosDenunciaDto(bool Operar, bool Asignar, bool Derivar);

public sealed record DenunciaDetalleDto(
    int Id,
    string Numero,
    string CodigoSeguimiento,
    TipoDelito Tipo,
    EstadoDenuncia Estado,
    Prioridad Prioridad,
    OrigenDenuncia Origen,
    DenuncianteDetalleDto Denunciante,
    DateTimeOffset FechaHecho,
    string LugarHecho,
    string Localidad,
    double? Latitud,
    double? Longitud,
    string Relato,
    string? BienesInvolucrados,
    DependenciaContactoDto? Dependencia,
    PersonaRefDto? Instructor,
    DateTimeOffset CreadaEn,
    DateTimeOffset ActualizadaEn,
    DateTimeOffset? CerradaEn,
    IReadOnlyList<ActuacionDto> Actuaciones,
    IReadOnlyList<AdjuntoDto> Adjuntos,
    IReadOnlyList<EstadoDenuncia> EstadosSiguientes,
    PermisosDenunciaDto Permisos);

public sealed record PuntoMapaDto(int Id, string Numero, TipoDelito Tipo, EstadoDenuncia Estado, Prioridad Prioridad, double Lat, double Lng, DateTimeOffset FechaHecho);

public sealed record CambioEstadoRequest(
    [Required(ErrorMessage = "Seleccioná el nuevo estado.")] EstadoDenuncia? Estado,
    [StringLength(2000)] string? Fundamento);

public sealed record AsignacionRequest([Required(ErrorMessage = "Seleccioná el instructor.")] int? PersonalId);

public sealed record DerivacionRequest(
    [Required(ErrorMessage = "Seleccioná la dependencia de destino.")] int? DependenciaId,
    [Required(ErrorMessage = "Indicá el motivo."), StringLength(1000)] string Motivo);

public sealed record PrioridadRequest([Required] Prioridad? Prioridad);

public sealed record NotaRequest(
    [Required(ErrorMessage = "Escribí la nota."), StringLength(4000)] string Texto,
    bool InformarAlDenunciante);

public sealed record SeguimientoRequest(
    [Required(ErrorMessage = "Ingresá el código de seguimiento.")] string Codigo,
    [Required(ErrorMessage = "Ingresá el DNI del denunciante.")] string Dni);

public sealed record MovimientoPublicoDto(DateTimeOffset Fecha, string Descripcion, EstadoDenuncia? Estado);

public sealed record SeguimientoDto(
    string Numero,
    TipoDelito Tipo,
    EstadoDenuncia Estado,
    DateTimeOffset FechaDenuncia,
    DateTimeOffset FechaHecho,
    string Denunciante,
    DependenciaContactoDto? Dependencia,
    IReadOnlyList<MovimientoPublicoDto> Movimientos);
