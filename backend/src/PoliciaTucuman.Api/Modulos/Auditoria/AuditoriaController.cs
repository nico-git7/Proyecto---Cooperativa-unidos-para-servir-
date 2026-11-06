using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Api.Modulos.Auditoria;

public sealed record RegistroAuditoriaDto(long Id, DateTimeOffset Fecha, string Usuario, string Accion, string Entidad, string? EntidadId, string? Detalle, string? Ip);

public sealed record CorreoDto(long Id, string Destinatario, string Plantilla, string? Referencia, EstadoCorreo Estado, int Intentos,
    DateTimeOffset CreadoEn, DateTimeOffset? EnviadoEn, string? UltimoError);

public sealed record FiltroAuditoria : ParametrosPagina
{
    public string? Texto { get; init; }
    public string? Entidad { get; init; }
}

public sealed record FiltroCorreos : ParametrosPagina
{
    public EstadoCorreo? Estado { get; init; }
}

[ApiController]
[Authorize(Roles = Roles.Administrador)]
[Route("api/auditoria")]
[Produces("application/json")]
public sealed class AuditoriaController(PoliciaDbContext db, TimeProvider reloj) : ControllerBase
{
    [HttpGet]
    public async Task<Pagina<RegistroAuditoriaDto>> Listar([FromQuery] FiltroAuditoria filtro, CancellationToken ct)
    {
        var q = db.Auditoria.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filtro.Entidad))
            q = q.Where(a => a.Entidad == filtro.Entidad);
        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var patron = $"%{filtro.Texto.Trim().Replace("%", "").Replace("_", "")}%";
            q = q.Where(a => EF.Functions.ILike(a.Usuario, patron) || EF.Functions.ILike(a.Accion, patron) ||
                             EF.Functions.ILike(a.EntidadId ?? "", patron) || EF.Functions.ILike(a.Detalle ?? "", patron));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.Id)
            .Skip(filtro.Saltear).Take(filtro.Tamano)
            .Select(a => new RegistroAuditoriaDto(a.Id, a.Fecha, a.Usuario, a.Accion, a.Entidad, a.EntidadId, a.Detalle, a.Ip))
            .ToListAsync(ct);
        return new Pagina<RegistroAuditoriaDto>(items, total, filtro.Pagina, filtro.Tamano);
    }

    [HttpGet("correos")]
    public async Task<Pagina<CorreoDto>> Correos([FromQuery] FiltroCorreos filtro, CancellationToken ct)
    {
        var q = db.CorreosSalientes.AsNoTracking();
        if (filtro.Estado.HasValue)
            q = q.Where(c => c.Estado == filtro.Estado);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(c => c.Id)
            .Skip(filtro.Saltear).Take(filtro.Tamano)
            .Select(c => new CorreoDto(c.Id, c.Destinatario, c.Plantilla, c.Referencia, c.Estado, c.Intentos, c.CreadoEn, c.EnviadoEn, c.UltimoError))
            .ToListAsync(ct);
        return new Pagina<CorreoDto>(items, total, filtro.Pagina, filtro.Tamano);
    }

    [HttpPost("correos/{id:long}/reintentar")]
    public async Task<IActionResult> Reintentar(long id, CancellationToken ct)
    {
        var correo = await db.CorreosSalientes.FirstOrDefaultAsync(c => c.Id == id, ct)
                     ?? throw new NoEncontradoException("El correo no existe.");
        correo.Estado = EstadoCorreo.Pendiente;
        correo.Intentos = 0;
        correo.ProximoIntento = reloj.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
