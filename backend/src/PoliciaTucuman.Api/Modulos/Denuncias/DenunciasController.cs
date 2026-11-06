using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Api.Modulos.Denuncias;

[ApiController]
[Authorize]
[Route("api/denuncias")]
[Produces("application/json")]
public sealed class DenunciasController(ServicioDenuncias servicio, TimeProvider reloj) : ControllerBase
{
    [HttpGet]
    public Task<Pagina<DenunciaItemDto>> Listar([FromQuery] FiltroDenuncias filtro, CancellationToken ct) =>
        servicio.ListarAsync(filtro, ct);

    [HttpGet("mapa")]
    public Task<IReadOnlyList<PuntoMapaDto>> Mapa([FromQuery] FiltroDenuncias filtro, CancellationToken ct) =>
        servicio.PuntosMapaAsync(filtro, ct);

    [HttpGet("exportar")]
    [Produces("text/csv")]
    public async Task<IActionResult> Exportar([FromQuery] FiltroDenuncias filtro, CancellationToken ct)
    {
        var contenido = await servicio.ExportarAsync(filtro, ct);
        var fecha = HoraArgentina.Convertir(reloj.GetUtcNow()).ToString("yyyyMMdd-HHmm");
        return File(contenido, "text/csv; charset=utf-8", $"denuncias-{fecha}.csv");
    }

    [HttpGet("{id:int}")]
    public Task<DenunciaDetalleDto> Obtener(int id, CancellationToken ct) => servicio.ObtenerAsync(id, ct);

    /// <summary>Alta presencial, cargada por el personal en la dependencia.</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<ActionResult<ComprobanteDenunciaDto>> Registrar([FromForm] NuevaDenunciaForm form, CancellationToken ct)
    {
        var comprobante = await servicio.RegistrarAsync(form, OrigenDenuncia.Presencial, ct);
        return CreatedAtAction(nameof(Obtener), new { id = comprobante.Id }, comprobante);
    }

    [HttpPost("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, CambioEstadoRequest request, CancellationToken ct)
    {
        await servicio.CambiarEstadoAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/asignacion")]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> Asignar(int id, AsignacionRequest request, CancellationToken ct)
    {
        await servicio.AsignarAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/derivacion")]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> Derivar(int id, DerivacionRequest request, CancellationToken ct)
    {
        await servicio.DerivarAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/prioridad")]
    [Authorize(Roles = Roles.Jefatura)]
    public async Task<IActionResult> CambiarPrioridad(int id, PrioridadRequest request, CancellationToken ct)
    {
        await servicio.CambiarPrioridadAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/notas")]
    public async Task<IActionResult> AgregarNota(int id, NotaRequest request, CancellationToken ct)
    {
        await servicio.AgregarNotaAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/adjuntos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> AgregarAdjunto(int id, IFormFile archivo, CancellationToken ct)
    {
        await servicio.AgregarAdjuntoAsync(id, archivo, ct);
        return NoContent();
    }

    [HttpGet("{id:int}/adjuntos/{adjuntoId:int}")]
    public async Task<IActionResult> DescargarAdjunto(int id, int adjuntoId, CancellationToken ct)
    {
        var (contenido, contentType, nombre) = await servicio.AbrirAdjuntoAsync(id, adjuntoId, ct);
        Response.Headers.CacheControl = "private, max-age=600";
        Response.Headers.ContentDisposition = $"inline; filename*=UTF-8''{Uri.EscapeDataString(nombre)}";
        return File(contenido, contentType);
    }
}
