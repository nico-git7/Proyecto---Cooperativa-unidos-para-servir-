using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Infrastructure.Correo;
using PoliciaTucuman.Infrastructure.Persistencia;
using PoliciaTucuman.Infrastructure.Seguridad;

namespace PoliciaTucuman.Api.Modulos.Autenticacion;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController(
    PoliciaDbContext db,
    IHasherPasswords hasher,
    ServicioTokens tokens,
    IColaCorreo correo,
    Auditor auditor,
    UsuarioActual actual,
    TimeProvider reloj,
    IOptions<OpcionesJwt> opcionesJwt,
    IOptions<OpcionesCorreo> opcionesCorreo) : ControllerBase
{
    private static readonly TimeSpan VigenciaRestablecimiento = TimeSpan.FromMinutes(30);

    [HttpPost("login")]
    [EnableRateLimiting(PoliticasLimite.Login)]
    public async Task<ActionResult<SesionDto>> Login(LoginRequest request, CancellationToken ct)
    {
        var ahora = reloj.GetUtcNow();
        var legajo = request.Legajo.Trim();
        var usuario = await db.Usuarios
            .Include(u => u.Personal).ThenInclude(p => p!.Dependencia)
            .FirstOrDefaultAsync(u => u.Personal!.Legajo == legajo, ct);

        const string credencialesInvalidas = "Legajo o contraseña incorrectos.";

        if (usuario is null)
            throw new ReglaNegocioException(credencialesInvalidas);

        if (usuario.EstaBloqueado(ahora))
        {
            var minutos = Math.Ceiling((usuario.BloqueadoHasta!.Value - ahora).TotalMinutes);
            throw new ReglaNegocioException($"El usuario está bloqueado temporalmente por intentos fallidos. Probá nuevamente en {minutos} minutos.");
        }

        if (!hasher.Verificar(usuario, request.Password))
        {
            usuario.RegistrarAccesoFallido(ahora);
            auditor.Registrar("Acceso fallido", "Usuario", usuario.Id, null, usuario.Id, $"Leg. {legajo}");
            await db.SaveChangesAsync(ct);
            throw new ReglaNegocioException(credencialesInvalidas);
        }

        if (!usuario.Activo)
            throw new ReglaNegocioException("El usuario se encuentra deshabilitado. Comunicate con la Dirección de Informática.");

        var ultimoAccesoPrevio = usuario.UltimoAcceso;
        usuario.RegistrarAccesoCorrecto(ahora);
        auditor.Registrar("Inicio de sesión", "Usuario", usuario.Id, null, usuario.Id, $"Leg. {legajo} - {usuario.Personal!.NombreCompleto}");
        await db.SaveChangesAsync(ct);

        var (token, vence) = tokens.Emitir(usuario, usuario.Personal);
        CookieSesion.Escribir(Response, opcionesJwt.Value, token, vence);

        return Sesion(usuario, ultimoAccesoPrevio, vence);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        CookieSesion.Eliminar(Response, opcionesJwt.Value);
        return NoContent();
    }

    [HttpGet("sesion")]
    [Authorize]
    public async Task<ActionResult<SesionDto>> ObtenerSesion(CancellationToken ct)
    {
        var usuario = await db.Usuarios
            .AsNoTracking()
            .Include(u => u.Personal).ThenInclude(p => p!.Dependencia)
            .FirstOrDefaultAsync(u => u.Id == actual.Id, ct);

        if (usuario is null || !usuario.Activo)
        {
            CookieSesion.Eliminar(Response, opcionesJwt.Value);
            return Unauthorized();
        }

        var exp = User.FindFirst("exp")?.Value;
        var vence = exp is null ? reloj.GetUtcNow() : DateTimeOffset.FromUnixTimeSeconds(long.Parse(exp));
        return Sesion(usuario, usuario.UltimoAcceso, vence);
    }

    [HttpPost("cambiar-password")]
    [Authorize]
    public async Task<IActionResult> CambiarPassword(CambioPasswordRequest request, CancellationToken ct)
    {
        var usuario = await db.Usuarios.FirstAsync(u => u.Id == actual.Id, ct);
        if (!hasher.Verificar(usuario, request.Actual))
            throw new ReglaNegocioException("La contraseña actual no es correcta.");

        if (request.Actual == request.Nueva)
            throw new ReglaNegocioException("La nueva contraseña tiene que ser distinta de la actual.");

        PoliticaPasswords.Validar(request.Nueva);
        usuario.EstablecerPassword(hasher.Hashear(request.Nueva), temporal: false);
        auditor.Registrar("Cambio de contraseña", "Usuario", usuario.Id);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Envía un enlace de restablecimiento al correo registrado. Responde igual exista o no el legajo.</summary>
    [HttpPost("recuperar")]
    [EnableRateLimiting(PoliticasLimite.Login)]
    public async Task<IActionResult> Recuperar(RecuperoRequest request, CancellationToken ct)
    {
        var legajo = request.Legajo.Trim();
        var usuario = await db.Usuarios
            .Include(u => u.Personal)
            .FirstOrDefaultAsync(u => u.Personal!.Legajo == legajo && u.Activo, ct);

        if (usuario?.Personal?.Email is { } email)
        {
            var token = TokensSeguros.Generar();
            usuario.TokenRestablecimientoHash = TokensSeguros.Hash(token);
            usuario.TokenRestablecimientoVence = reloj.GetUtcNow().Add(VigenciaRestablecimiento);

            correo.Encolar(email, PlantillasCorreo.RestablecerPassword, new
            {
                nombre = usuario.Personal.Nombre,
                legajo = usuario.Personal.Legajo,
                url = $"{opcionesCorreo.Value.UrlSitio.TrimEnd('/')}/intranet/restablecer?token={token}",
                minutos = (int)VigenciaRestablecimiento.TotalMinutes,
            }, $"Leg. {legajo}");

            auditor.Registrar("Solicitud de restablecimiento", "Usuario", usuario.Id, null, usuario.Id, $"Leg. {legajo}");
            await db.SaveChangesAsync(ct);
        }

        return Accepted();
    }

    [HttpPost("restablecer")]
    [EnableRateLimiting(PoliticasLimite.Login)]
    public async Task<IActionResult> Restablecer(RestablecerRequest request, CancellationToken ct)
    {
        var hash = TokensSeguros.Hash(request.Token.Trim());
        var ahora = reloj.GetUtcNow();
        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.TokenRestablecimientoHash == hash, ct);

        if (usuario is null || usuario.TokenRestablecimientoVence < ahora)
            throw new ReglaNegocioException("El enlace no es válido o ya venció. Solicitá uno nuevo.");

        PoliticaPasswords.Validar(request.Nueva);
        usuario.EstablecerPassword(hasher.Hashear(request.Nueva), temporal: false);
        auditor.Registrar("Restablecimiento de contraseña", "Usuario", usuario.Id, null, usuario.Id, $"Usuario {usuario.Id}");
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static SesionDto Sesion(Usuario usuario, DateTimeOffset? ultimoAcceso, DateTimeOffset vence)
    {
        var p = usuario.Personal!;
        return new SesionDto(usuario.Id, p.Legajo, p.Nombre, p.Apellido, p.Jerarquia, usuario.Rol,
            new DependenciaRefDto(p.DependenciaId, p.Dependencia?.Nombre ?? string.Empty),
            usuario.DebeCambiarPassword, ultimoAcceso, vence);
    }
}
