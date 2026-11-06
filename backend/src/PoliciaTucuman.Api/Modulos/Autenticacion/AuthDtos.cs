using System.ComponentModel.DataAnnotations;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Api.Modulos.Autenticacion;

public sealed record LoginRequest(
    [Required(ErrorMessage = "Ingresá tu legajo.")] string Legajo,
    [Required(ErrorMessage = "Ingresá tu contraseña.")] string Password);

public sealed record CambioPasswordRequest(
    [Required(ErrorMessage = "Ingresá tu contraseña actual.")] string Actual,
    [Required(ErrorMessage = "Ingresá la nueva contraseña.")] string Nueva);

public sealed record RecuperoRequest([Required(ErrorMessage = "Ingresá tu legajo.")] string Legajo);

public sealed record RestablecerRequest(
    [Required] string Token,
    [Required(ErrorMessage = "Ingresá la nueva contraseña.")] string Nueva);

public sealed record DependenciaRefDto(int Id, string Nombre);

public sealed record SesionDto(
    int Id,
    string Legajo,
    string Nombre,
    string Apellido,
    Jerarquia Jerarquia,
    RolUsuario Rol,
    DependenciaRefDto Dependencia,
    bool DebeCambiarPassword,
    DateTimeOffset? UltimoAcceso,
    DateTimeOffset Vence);
