using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Api.Seguridad;

/// <summary>Datos del usuario autenticado tomados del token, sin ir a la base.</summary>
public sealed class UsuarioActual(IHttpContextAccessor accessor)
{
    private ClaimsPrincipal Principal => accessor.HttpContext?.User ?? new ClaimsPrincipal();

    public bool Autenticado => Principal.Identity?.IsAuthenticated == true;

    public int Id => int.Parse(Valor(JwtRegisteredClaimNames.Sub) ?? Valor(ClaimTypes.NameIdentifier)
        ?? throw new AccesoDenegadoException("Sesión no válida."));

    public string Nombre => Valor(ClaimTypes.Name) ?? string.Empty;
    public string Legajo => Valor(Claims.Legajo) ?? string.Empty;
    public int DependenciaId => int.Parse(Valor(Claims.DependenciaId) ?? "0");
    public int PersonalId => int.Parse(Valor(Claims.PersonalId) ?? "0");

    public RolUsuario Rol => Enum.TryParse<RolUsuario>(Valor(ClaimTypes.Role), out var rol) ? rol : RolUsuario.Operador;

    public bool EsAdministrador => Rol == RolUsuario.Administrador;
    public bool EsJefatura => Rol is RolUsuario.Administrador or RolUsuario.JefeDependencia;

    /// <summary>Dependencia a la que se restringen las consultas; null si ve toda la provincia.</summary>
    public int? AlcanceDependencia => EsAdministrador ? null : DependenciaId;

    public string Descripcion => Autenticado ? $"Leg. {Legajo} - {Nombre}" : "Comisaría Virtual";

    public string? Ip => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public void ExigirAccesoA(int? dependenciaId)
    {
        if (!EsAdministrador && dependenciaId != DependenciaId)
            throw new AccesoDenegadoException("No tiene acceso a registros de otra dependencia.");
    }

    private string? Valor(string tipo) => Principal.FindFirst(tipo)?.Value;
}
