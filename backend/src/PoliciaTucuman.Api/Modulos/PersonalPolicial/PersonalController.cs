using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;
using PoliciaTucuman.Infrastructure.Persistencia;
using Entidad = PoliciaTucuman.Domain.Entidades.Personal;

namespace PoliciaTucuman.Api.Modulos.PersonalPolicial;

public sealed record PersonalItemDto(
    int Id, string Legajo, string Apellido, string Nombre, string Dni, Jerarquia Jerarquia, SituacionRevista Situacion,
    int DependenciaId, string Dependencia, string? Email, string? Telefono, DateOnly FechaIngreso, RolUsuario? Rol);

public sealed record InstructorDto(int Id, string Legajo, string Nombre, Jerarquia Jerarquia, int DenunciasAbiertas);

public sealed record FiltroPersonal : ParametrosPagina
{
    public string? Texto { get; init; }
    public int? DependenciaId { get; init; }
    public Jerarquia? Jerarquia { get; init; }
    public SituacionRevista? Situacion { get; init; }
}

public sealed record PersonalRequest(
    [Required(ErrorMessage = "Ingresá el legajo."), RegularExpression(@"^\d{3,10}$", ErrorMessage = "El legajo debe ser numérico.")] string Legajo,
    [Required(ErrorMessage = "Ingresá el apellido."), StringLength(80)] string Apellido,
    [Required(ErrorMessage = "Ingresá el nombre."), StringLength(80)] string Nombre,
    [Required(ErrorMessage = "Ingresá el DNI.")] string Dni,
    [Required(ErrorMessage = "Seleccioná la jerarquía.")] Jerarquia? Jerarquia,
    [Required] SituacionRevista? Situacion,
    [Required(ErrorMessage = "Seleccioná la dependencia.")] int? DependenciaId,
    [EmailAddress(ErrorMessage = "El correo no es válido."), StringLength(120)] string? Email,
    [StringLength(40)] string? Telefono,
    [Required(ErrorMessage = "Ingresá la fecha de ingreso.")] DateOnly? FechaIngreso);

[ApiController]
[Authorize]
[Route("api/personal")]
[Produces("application/json")]
public sealed class PersonalController(PoliciaDbContext db, UsuarioActual usuario, Auditor auditor) : ControllerBase
{
    [HttpGet]
    public async Task<Pagina<PersonalItemDto>> Listar([FromQuery] FiltroPersonal filtro, CancellationToken ct)
    {
        var q = db.Personal.AsNoTracking();

        if (usuario.AlcanceDependencia is { } alcance)
            q = q.Where(p => p.DependenciaId == alcance);
        else if (filtro.DependenciaId.HasValue)
            q = q.Where(p => p.DependenciaId == filtro.DependenciaId);

        if (filtro.Jerarquia.HasValue)
            q = q.Where(p => p.Jerarquia == filtro.Jerarquia);
        if (filtro.Situacion.HasValue)
            q = q.Where(p => p.Situacion == filtro.Situacion);

        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = filtro.Texto.Trim();
            var patron = $"%{texto.Replace("%", "").Replace("_", "")}%";
            q = q.Where(p => p.Legajo == texto || p.Dni == texto ||
                             EF.Functions.ILike(EF.Functions.Unaccent(p.Apellido), EF.Functions.Unaccent(patron)) ||
                             EF.Functions.ILike(EF.Functions.Unaccent(p.Nombre), EF.Functions.Unaccent(patron)));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(p => p.Jerarquia).ThenBy(p => p.Apellido).ThenBy(p => p.Nombre)
            .Skip(filtro.Saltear).Take(filtro.Tamano)
            .Select(p => new PersonalItemDto(p.Id, p.Legajo, p.Apellido, p.Nombre, p.Dni, p.Jerarquia, p.Situacion,
                p.DependenciaId, p.Dependencia!.Nombre, p.Email, p.Telefono, p.FechaIngreso,
                p.Usuario != null ? p.Usuario.Rol : null))
            .ToListAsync(ct);

        return new Pagina<PersonalItemDto>(items, total, filtro.Pagina, filtro.Tamano);
    }

    /// <summary>Efectivos en servicio que pueden instruir una denuncia, con su carga de trabajo actual.</summary>
    [HttpGet("instructores")]
    public async Task<IReadOnlyList<InstructorDto>> Instructores([FromQuery] int dependenciaId, CancellationToken ct)
    {
        usuario.ExigirAccesoA(dependenciaId);

        var lista = await db.Personal.AsNoTracking()
            .Where(p => p.DependenciaId == dependenciaId && p.Situacion == SituacionRevista.ServicioEfectivo)
            .Select(p => new
            {
                p.Id, p.Legajo, p.Apellido, p.Nombre, p.Jerarquia,
                Abiertas = db.Denuncias.Count(d => d.OficialAsignadoId == p.Id && d.Estado != EstadoDenuncia.Resuelta
                                                   && d.Estado != EstadoDenuncia.Archivada && d.Estado != EstadoDenuncia.Desestimada),
            })
            .ToListAsync(ct);

        return lista
            .OrderByDescending(p => p.Jerarquia >= Jerarquia.OficialAyudante)
            .ThenBy(p => p.Abiertas)
            .ThenByDescending(p => p.Jerarquia)
            .Select(p => new InstructorDto(p.Id, p.Legajo, $"{p.Apellido}, {p.Nombre}", p.Jerarquia, p.Abiertas))
            .ToList();
    }

    [HttpPost]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> Crear(PersonalRequest request, CancellationToken ct)
    {
        var personal = new Entidad();
        await Aplicar(personal, request, ct);
        db.Personal.Add(personal);
        auditor.Registrar("Alta", "Personal", personal.Legajo, personal.NombreCompleto);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new { personal.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> Modificar(int id, PersonalRequest request, CancellationToken ct)
    {
        var personal = await db.Personal.FirstOrDefaultAsync(p => p.Id == id, ct)
                       ?? throw new NoEncontradoException("El efectivo no existe.");
        usuario.ExigirAccesoA(personal.DependenciaId);

        var cambios = new List<string>();
        if (personal.Jerarquia != request.Jerarquia) cambios.Add($"jerarquía {personal.Jerarquia.Nombre()} → {request.Jerarquia!.Value.Nombre()}");
        if (personal.Situacion != request.Situacion) cambios.Add($"situación {personal.Situacion} → {request.Situacion}");
        if (personal.DependenciaId != request.DependenciaId) cambios.Add("cambio de destino");

        await Aplicar(personal, request, ct);
        auditor.Registrar("Modificación", "Personal", personal.Legajo, cambios.Count > 0 ? string.Join("; ", cambios) : personal.NombreCompleto);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task Aplicar(Entidad p, PersonalRequest r, CancellationToken ct)
    {
        usuario.ExigirAccesoA(r.DependenciaId);

        var dni = Documento.Normalizar(r.Dni);
        if (!Documento.EsValido(dni))
            throw new ReglaNegocioException("El DNI no es válido.");

        if (!await db.Dependencias.AnyAsync(d => d.Id == r.DependenciaId, ct))
            throw new ReglaNegocioException("La dependencia no existe.");

        var legajo = r.Legajo.Trim();
        if (await db.Personal.AnyAsync(x => x.Legajo == legajo && x.Id != p.Id, ct))
            throw new ConflictoException($"El legajo {legajo} ya está registrado.");
        if (await db.Personal.AnyAsync(x => x.Dni == dni && x.Id != p.Id, ct))
            throw new ConflictoException("Ya hay un efectivo registrado con ese DNI.");

        p.Legajo = legajo;
        p.Apellido = r.Apellido.Trim();
        p.Nombre = r.Nombre.Trim();
        p.Dni = dni;
        p.Jerarquia = r.Jerarquia!.Value;
        p.Situacion = r.Situacion!.Value;
        p.DependenciaId = r.DependenciaId!.Value;
        p.Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim().ToLowerInvariant();
        p.Telefono = string.IsNullOrWhiteSpace(r.Telefono) ? null : r.Telefono.Trim();
        p.FechaIngreso = r.FechaIngreso!.Value;
    }
}
