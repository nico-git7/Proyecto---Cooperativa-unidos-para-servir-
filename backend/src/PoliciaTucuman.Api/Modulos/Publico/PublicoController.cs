using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Modulos.Denuncias;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Infrastructure.Persistencia;
using PoliciaTucuman.Infrastructure.Persistencia.Semillas;

namespace PoliciaTucuman.Api.Modulos.Publico;

public sealed record AccesoDemoDto(string Legajo, string Perfil, string Descripcion);

public sealed record ConfiguracionPublicaDto(bool ModoDemo, string? PasswordDemo, IReadOnlyList<AccesoDemoDto> AccesosDemo);

public sealed record DependenciaPublicaDto(
    int Id, string Nombre, TipoDependencia Tipo, string UnidadRegional, string Direccion, string Localidad,
    string? Telefono, double? Latitud, double? Longitud);

/// <summary>Endpoints sin autenticación de la Comisaría Virtual.</summary>
[ApiController]
[Route("api/publico")]
[Produces("application/json")]
public sealed class PublicoController(PoliciaDbContext db, ServicioDenuncias denuncias, IOptions<OpcionesSemilla> semilla) : ControllerBase
{
    [HttpGet("configuracion")]
    [ResponseCache(Duration = 60)]
    public ConfiguracionPublicaDto Configuracion()
    {
        if (!semilla.Value.DatosDemo)
            return new ConfiguracionPublicaDto(false, null, []);

        return new ConfiguracionPublicaDto(true, semilla.Value.PasswordInicial,
        [
            new(SemillaBase.LegajoAdministrador, "Administrador", "Dirección de Informática · acceso a toda la provincia"),
            new(SemillaDemo.LegajoJefeDemo, "Jefe de dependencia", "Comisaría Seccional 1ª"),
            new(SemillaDemo.LegajoOperadorDemo, "Operador", "Comisaría Seccional 1ª"),
        ]);
    }

    [HttpGet("dependencias")]
    [ResponseCache(Duration = 300)]
    public async Task<IReadOnlyList<DependenciaPublicaDto>> Dependencias(CancellationToken ct) =>
        await db.Dependencias
            .AsNoTracking()
            .Where(d => d.Activa && d.RecibeDenuncias)
            .OrderBy(d => d.UnidadRegional!.Id).ThenBy(d => d.Id)
            .Select(d => new DependenciaPublicaDto(d.Id, d.Nombre, d.Tipo, d.UnidadRegional!.Nombre, d.Direccion, d.Localidad,
                d.Telefono, d.Latitud, d.Longitud))
            .ToListAsync(ct);

    [HttpPost("denuncias")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    [EnableRateLimiting(PoliticasLimite.DenunciaPublica)]
    public async Task<ActionResult<ComprobanteDenunciaDto>> RegistrarDenuncia([FromForm] NuevaDenunciaForm form, CancellationToken ct)
    {
        form.DependenciaId = null;
        var comprobante = await denuncias.RegistrarAsync(form, OrigenDenuncia.Web, ct);
        return StatusCode(StatusCodes.Status201Created, comprobante);
    }

    [HttpPost("seguimiento")]
    [EnableRateLimiting(PoliticasLimite.Seguimiento)]
    public Task<SeguimientoDto> Seguimiento(SeguimientoRequest request, CancellationToken ct) =>
        denuncias.SeguimientoAsync(request, ct);
}
