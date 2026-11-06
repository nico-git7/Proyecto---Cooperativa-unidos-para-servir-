using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Api.Modulos.Moviles;

public sealed record MovilDto(
    int Id, string NumeroInterno, string Dominio, TipoMovil Tipo, string Marca, string Modelo, int Anio,
    EstadoMovil Estado, int DependenciaId, string Dependencia, int Kilometraje, string? Observaciones);

public sealed record MovilRequest(
    [Required(ErrorMessage = "Ingresá el número interno."), StringLength(20)] string NumeroInterno,
    [Required(ErrorMessage = "Ingresá el dominio."), RegularExpression(@"^([A-Za-z]{2}\s?\d{3}\s?[A-Za-z]{2}|[A-Za-z]{3}\s?\d{3}|[A-Za-z]\d{3}[A-Za-z]{3}|\d{3}[A-Za-z]{3})$", ErrorMessage = "El dominio no tiene un formato válido.")] string Dominio,
    [Required] TipoMovil? Tipo,
    [Required(ErrorMessage = "Ingresá la marca."), StringLength(40)] string Marca,
    [Required(ErrorMessage = "Ingresá el modelo."), StringLength(60)] string Modelo,
    [Range(1990, 2100, ErrorMessage = "El año no es válido.")] int Anio,
    [Required] EstadoMovil? Estado,
    [Required(ErrorMessage = "Seleccioná la dependencia.")] int? DependenciaId,
    [Range(0, 2_000_000, ErrorMessage = "El kilometraje no es válido.")] int Kilometraje,
    [StringLength(500)] string? Observaciones);

public sealed record EstadoMovilRequest([Required] EstadoMovil? Estado, int? Kilometraje, [StringLength(500)] string? Observaciones);

[ApiController]
[Authorize]
[Route("api/moviles")]
[Produces("application/json")]
public sealed class MovilesController(PoliciaDbContext db, UsuarioActual usuario, Auditor auditor) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<MovilDto>> Listar(
        [FromQuery] string? texto, [FromQuery] int? dependenciaId, [FromQuery] EstadoMovil? estado, [FromQuery] TipoMovil? tipo,
        CancellationToken ct)
    {
        var q = db.Moviles.AsNoTracking();
        if (usuario.AlcanceDependencia is { } alcance)
            q = q.Where(m => m.DependenciaId == alcance);
        else if (dependenciaId.HasValue)
            q = q.Where(m => m.DependenciaId == dependenciaId);
        if (estado.HasValue)
            q = q.Where(m => m.Estado == estado);
        if (tipo.HasValue)
            q = q.Where(m => m.Tipo == tipo);
        if (!string.IsNullOrWhiteSpace(texto))
        {
            var t = texto.Trim().ToUpperInvariant().Replace(" ", "");
            q = q.Where(m => m.Dominio.Contains(t) || m.NumeroInterno.Contains(t) || m.Modelo.ToUpper().Contains(t));
        }

        return await q
            .OrderBy(m => m.Dependencia!.UnidadRegionalId).ThenBy(m => m.DependenciaId).ThenBy(m => m.NumeroInterno)
            .Select(m => new MovilDto(m.Id, m.NumeroInterno, m.Dominio, m.Tipo, m.Marca, m.Modelo, m.Anio, m.Estado,
                m.DependenciaId, m.Dependencia!.Nombre, m.Kilometraje, m.Observaciones))
            .ToListAsync(ct);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> Crear(MovilRequest request, CancellationToken ct)
    {
        var movil = new Movil();
        await Aplicar(movil, request, ct);
        db.Moviles.Add(movil);
        auditor.Registrar("Alta", "Móvil", movil.NumeroInterno, $"{movil.Marca} {movil.Modelo} - {movil.Dominio}");
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new { movil.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> Modificar(int id, MovilRequest request, CancellationToken ct)
    {
        var movil = await Cargar(id, ct);
        await Aplicar(movil, request, ct);
        auditor.Registrar("Modificación", "Móvil", movil.NumeroInterno, movil.Dominio);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, EstadoMovilRequest request, CancellationToken ct)
    {
        var movil = await Cargar(id, ct);
        if (request.Kilometraje.HasValue)
        {
            if (request.Kilometraje < movil.Kilometraje)
                throw new ReglaNegocioException("El kilometraje no puede ser menor al registrado.");
            movil.Kilometraje = request.Kilometraje.Value;
        }

        var anterior = movil.Estado;
        movil.Estado = request.Estado!.Value;
        if (request.Observaciones is not null)
            movil.Observaciones = string.IsNullOrWhiteSpace(request.Observaciones) ? null : request.Observaciones.Trim();

        auditor.Registrar("Cambio de estado", "Móvil", movil.NumeroInterno, $"{anterior} → {movil.Estado}");
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<Movil> Cargar(int id, CancellationToken ct)
    {
        var movil = await db.Moviles.FirstOrDefaultAsync(m => m.Id == id, ct)
                    ?? throw new NoEncontradoException("El móvil no existe.");
        usuario.ExigirAccesoA(movil.DependenciaId);
        return movil;
    }

    private async Task Aplicar(Movil m, MovilRequest r, CancellationToken ct)
    {
        usuario.ExigirAccesoA(r.DependenciaId);
        var dominio = r.Dominio.ToUpperInvariant().Replace(" ", "");
        var interno = r.NumeroInterno.Trim().ToUpperInvariant();

        if (await db.Moviles.AnyAsync(x => x.Dominio == dominio && x.Id != m.Id, ct))
            throw new ConflictoException($"El dominio {dominio} ya está registrado.");
        if (await db.Moviles.AnyAsync(x => x.NumeroInterno == interno && x.Id != m.Id, ct))
            throw new ConflictoException($"El número interno {interno} ya está registrado.");

        m.NumeroInterno = interno;
        m.Dominio = dominio;
        m.Tipo = r.Tipo!.Value;
        m.Marca = r.Marca.Trim();
        m.Modelo = r.Modelo.Trim();
        m.Anio = r.Anio;
        m.Estado = r.Estado!.Value;
        m.DependenciaId = r.DependenciaId!.Value;
        m.Kilometraje = r.Kilometraje;
        m.Observaciones = string.IsNullOrWhiteSpace(r.Observaciones) ? null : r.Observaciones.Trim();
    }
}
