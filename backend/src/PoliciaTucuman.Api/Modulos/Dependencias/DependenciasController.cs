using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Api.Modulos.Dependencias;

public sealed record UnidadRegionalDto(int Id, string Codigo, string Nombre, string Cabecera);

public sealed record DependenciaDto(
    int Id, string Nombre, TipoDependencia Tipo, int UnidadRegionalId, string UnidadRegional,
    string Direccion, string Localidad, string? Telefono, string? Email, double? Latitud, double? Longitud,
    bool RecibeDenuncias, bool Activa, int Personal, int Moviles, int DenunciasAbiertas);

public sealed record DependenciaRequest(
    [Required(ErrorMessage = "Ingresá el nombre."), StringLength(120)] string Nombre,
    [Required] TipoDependencia? Tipo,
    [Required(ErrorMessage = "Seleccioná la unidad regional.")] int? UnidadRegionalId,
    [Required(ErrorMessage = "Ingresá la dirección."), StringLength(160)] string Direccion,
    [Required(ErrorMessage = "Ingresá la localidad."), StringLength(80)] string Localidad,
    [StringLength(40)] string? Telefono,
    [EmailAddress(ErrorMessage = "El correo no es válido."), StringLength(120)] string? Email,
    double? Latitud,
    double? Longitud,
    bool RecibeDenuncias,
    bool Activa);

[ApiController]
[Authorize]
[Route("api/dependencias")]
[Produces("application/json")]
public sealed class DependenciasController(PoliciaDbContext db, Auditor auditor) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<DependenciaDto>> Listar([FromQuery] bool incluirInactivas = false, CancellationToken ct = default)
    {
        var q = db.Dependencias.AsNoTracking();
        if (!incluirInactivas)
            q = q.Where(d => d.Activa);

        return await q
            .OrderBy(d => d.UnidadRegionalId).ThenBy(d => d.Tipo).ThenBy(d => d.Id)
            .Select(d => new DependenciaDto(
                d.Id, d.Nombre, d.Tipo, d.UnidadRegionalId, d.UnidadRegional!.Nombre,
                d.Direccion, d.Localidad, d.Telefono, d.Email, d.Latitud, d.Longitud, d.RecibeDenuncias, d.Activa,
                db.Personal.Count(p => p.DependenciaId == d.Id && p.Situacion != SituacionRevista.Pasiva),
                db.Moviles.Count(m => m.DependenciaId == d.Id),
                db.Denuncias.Count(x => x.DependenciaId == d.Id && x.Estado != EstadoDenuncia.Resuelta
                                        && x.Estado != EstadoDenuncia.Archivada && x.Estado != EstadoDenuncia.Desestimada)))
            .ToListAsync(ct);
    }

    [HttpGet("unidades-regionales")]
    public async Task<IReadOnlyList<UnidadRegionalDto>> UnidadesRegionales(CancellationToken ct) =>
        await db.UnidadesRegionales.AsNoTracking().OrderBy(u => u.Id)
            .Select(u => new UnidadRegionalDto(u.Id, u.Codigo, u.Nombre, u.Cabecera))
            .ToListAsync(ct);

    [HttpPost]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Crear(DependenciaRequest request, CancellationToken ct)
    {
        var dependencia = new Dependencia();
        await Aplicar(dependencia, request, ct);
        db.Dependencias.Add(dependencia);
        auditor.Registrar("Alta", "Dependencia", null, dependencia.Nombre);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new { dependencia.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Administrador)]
    public async Task<IActionResult> Modificar(int id, DependenciaRequest request, CancellationToken ct)
    {
        var dependencia = await db.Dependencias.FirstOrDefaultAsync(d => d.Id == id, ct)
                          ?? throw new NoEncontradoException("La dependencia no existe.");
        await Aplicar(dependencia, request, ct);
        auditor.Registrar("Modificación", "Dependencia", id, dependencia.Nombre);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task Aplicar(Dependencia d, DependenciaRequest r, CancellationToken ct)
    {
        if (!await db.UnidadesRegionales.AnyAsync(u => u.Id == r.UnidadRegionalId, ct))
            throw new ReglaNegocioException("La unidad regional no existe.");

        if (r.Latitud.HasValue != r.Longitud.HasValue)
            throw new ReglaNegocioException("Completá latitud y longitud, o dejá ambas vacías.");

        if (r.Latitud.HasValue && !Geografia.EstaEnTucuman(r.Latitud.Value, r.Longitud!.Value))
            throw new ReglaNegocioException("La ubicación debe estar dentro de la provincia.");

        var nombre = r.Nombre.Trim();
        if (await db.Dependencias.AnyAsync(x => x.Nombre == nombre && x.Id != d.Id, ct))
            throw new ConflictoException("Ya existe una dependencia con ese nombre.");

        d.Nombre = nombre;
        d.Tipo = r.Tipo!.Value;
        d.UnidadRegionalId = r.UnidadRegionalId!.Value;
        d.Direccion = r.Direccion.Trim();
        d.Localidad = r.Localidad.Trim();
        d.Telefono = string.IsNullOrWhiteSpace(r.Telefono) ? null : r.Telefono.Trim();
        d.Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim().ToLowerInvariant();
        d.Latitud = r.Latitud;
        d.Longitud = r.Longitud;
        d.RecibeDenuncias = r.RecibeDenuncias;
        d.Activa = r.Activa;
    }
}
