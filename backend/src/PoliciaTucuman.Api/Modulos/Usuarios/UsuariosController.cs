using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;
using PoliciaTucuman.Infrastructure.Correo;
using PoliciaTucuman.Infrastructure.Persistencia;
using PoliciaTucuman.Infrastructure.Seguridad;

namespace PoliciaTucuman.Api.Modulos.Usuarios;

public sealed record UsuarioDto(
    int Id, int PersonalId, string Legajo, string Nombre, Jerarquia Jerarquia, string Dependencia, string? Email,
    RolUsuario Rol, bool Activo, bool Bloqueado, bool DebeCambiarPassword, DateTimeOffset CreadoEn, DateTimeOffset? UltimoAcceso);

public sealed record AltaUsuarioRequest(
    [Required(ErrorMessage = "Seleccioná el efectivo.")] int? PersonalId,
    [Required(ErrorMessage = "Seleccioná el rol.")] RolUsuario? Rol);

public sealed record ModificacionUsuarioRequest([Required] RolUsuario? Rol, bool Activo);

public sealed record CredencialTemporalDto(int UsuarioId, string Legajo, string PasswordTemporal, bool CorreoEnviado);

[ApiController]
[Authorize(Roles = Roles.Administrador)]
[Route("api/usuarios")]
[Produces("application/json")]
public sealed class UsuariosController(
    PoliciaDbContext db,
    IHasherPasswords hasher,
    IColaCorreo correo,
    Auditor auditor,
    UsuarioActual actual,
    TimeProvider reloj,
    IOptions<OpcionesCorreo> opcionesCorreo) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<UsuarioDto>> Listar([FromQuery] string? texto, [FromQuery] RolUsuario? rol, CancellationToken ct)
    {
        var ahora = reloj.GetUtcNow();
        var q = db.Usuarios.AsNoTracking();
        if (rol.HasValue)
            q = q.Where(u => u.Rol == rol);
        if (!string.IsNullOrWhiteSpace(texto))
        {
            var t = texto.Trim();
            var patron = $"%{t.Replace("%", "").Replace("_", "")}%";
            q = q.Where(u => u.Personal!.Legajo == t ||
                             EF.Functions.ILike(EF.Functions.Unaccent(u.Personal.Apellido), EF.Functions.Unaccent(patron)) ||
                             EF.Functions.ILike(EF.Functions.Unaccent(u.Personal.Dependencia!.Nombre), EF.Functions.Unaccent(patron)));
        }

        return await q
            .OrderBy(u => u.Rol).ThenBy(u => u.Personal!.Apellido)
            .Select(u => new UsuarioDto(u.Id, u.PersonalId, u.Personal!.Legajo, u.Personal.Apellido + ", " + u.Personal.Nombre,
                u.Personal.Jerarquia, u.Personal.Dependencia!.Nombre, u.Personal.Email, u.Rol, u.Activo,
                u.BloqueadoHasta != null && u.BloqueadoHasta > ahora, u.DebeCambiarPassword, u.CreadoEn, u.UltimoAcceso))
            .ToListAsync(ct);
    }

    [HttpPost]
    public async Task<ActionResult<CredencialTemporalDto>> Crear(AltaUsuarioRequest request, CancellationToken ct)
    {
        var personal = await db.Personal.Include(p => p.Usuario).FirstOrDefaultAsync(p => p.Id == request.PersonalId, ct)
                       ?? throw new NoEncontradoException("El efectivo no existe.");

        if (personal.Usuario is not null)
            throw new ConflictoException($"El legajo {personal.Legajo} ya tiene usuario.");

        if (personal.Situacion == SituacionRevista.Pasiva)
            throw new ReglaNegocioException("No se puede dar acceso a personal en situación pasiva.");

        var temporal = hasher.GenerarTemporal();
        var usuario = new Usuario
        {
            PersonalId = personal.Id,
            Rol = request.Rol!.Value,
            PasswordHash = hasher.Hashear(temporal),
            DebeCambiarPassword = true,
            CreadoEn = reloj.GetUtcNow(),
        };
        db.Usuarios.Add(usuario);

        var enviado = EnviarCredencial(personal, temporal, nuevo: true);
        auditor.Registrar("Alta", "Usuario", personal.Legajo, $"{personal.NombreCompleto} - {usuario.Rol.Nombre()}");
        await db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, new CredencialTemporalDto(usuario.Id, personal.Legajo, temporal, enviado));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Modificar(int id, ModificacionUsuarioRequest request, CancellationToken ct)
    {
        var usuario = await db.Usuarios.Include(u => u.Personal).FirstOrDefaultAsync(u => u.Id == id, ct)
                      ?? throw new NoEncontradoException("El usuario no existe.");

        if (usuario.Id == actual.Id && (!request.Activo || request.Rol != usuario.Rol))
            throw new ReglaNegocioException("No podés cambiar tu propio rol ni deshabilitar tu usuario.");

        var detalle = new List<string>();
        if (usuario.Rol != request.Rol) detalle.Add($"rol {usuario.Rol.Nombre()} → {request.Rol!.Value.Nombre()}");
        if (usuario.Activo != request.Activo) detalle.Add(request.Activo ? "habilitado" : "deshabilitado");

        usuario.Rol = request.Rol!.Value;
        usuario.Activo = request.Activo;
        if (request.Activo)
            usuario.BloqueadoHasta = null;

        auditor.Registrar("Modificación", "Usuario", usuario.Personal!.Legajo, string.Join("; ", detalle));
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:int}/restablecer")]
    public async Task<ActionResult<CredencialTemporalDto>> Restablecer(int id, CancellationToken ct)
    {
        var usuario = await db.Usuarios.Include(u => u.Personal).FirstOrDefaultAsync(u => u.Id == id, ct)
                      ?? throw new NoEncontradoException("El usuario no existe.");

        var temporal = hasher.GenerarTemporal();
        usuario.EstablecerPassword(hasher.Hashear(temporal), temporal: true);
        var enviado = EnviarCredencial(usuario.Personal!, temporal, nuevo: false);
        auditor.Registrar("Restablecimiento de contraseña", "Usuario", usuario.Personal!.Legajo);
        await db.SaveChangesAsync(ct);

        return new CredencialTemporalDto(usuario.Id, usuario.Personal.Legajo, temporal, enviado);
    }

    private bool EnviarCredencial(Personal personal, string temporal, bool nuevo)
    {
        if (personal.Email is null)
            return false;

        correo.Encolar(personal.Email, PlantillasCorreo.Bienvenida, new
        {
            nombre = personal.Nombre,
            jerarquia = personal.Jerarquia.Nombre(),
            legajo = personal.Legajo,
            password = temporal,
            nuevo,
            url = $"{opcionesCorreo.Value.UrlSitio.TrimEnd('/')}/intranet",
        }, $"Leg. {personal.Legajo}");
        return true;
    }
}
