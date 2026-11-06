using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Api.Modulos.Estadisticas;

public sealed record IndicadoresDto(
    int Total,
    int Abiertas,
    int SinInstructor,
    int Urgentes,
    int Ultimas24Horas,
    int CerradasEnPeriodo,
    double? HorasPromedioAsignacion,
    double PorcentajeWeb);

public sealed record CantidadDto(string Clave, int Cantidad);

public sealed record SerieDto(DateOnly Fecha, int Recibidas, int Cerradas);

public sealed record RecienteDto(int Id, string Numero, TipoDelito Tipo, Prioridad Prioridad, EstadoDenuncia Estado, string? Dependencia, DateTimeOffset CreadaEn, OrigenDenuncia Origen);

public sealed record PanelDto(
    int Dias,
    string Alcance,
    IndicadoresDto Indicadores,
    IReadOnlyList<SerieDto> Serie,
    IReadOnlyList<CantidadDto> PorTipo,
    IReadOnlyList<CantidadDto> PorEstado,
    IReadOnlyList<CantidadDto> PorUnidadRegional,
    IReadOnlyList<CantidadDto> PorDependencia,
    IReadOnlyList<CantidadDto> PorFranjaHoraria,
    IReadOnlyList<RecienteDto> Recientes);

[ApiController]
[Authorize]
[Route("api/estadisticas")]
[Produces("application/json")]
public sealed class EstadisticasController(PoliciaDbContext db, UsuarioActual usuario, TimeProvider reloj) : ControllerBase
{
    [HttpGet("panel")]
    public async Task<PanelDto> Panel([FromQuery] int dias = 30, CancellationToken ct = default)
    {
        dias = Math.Clamp(dias, 7, 365);
        var ahora = reloj.GetUtcNow();
        var hoyLocal = DateOnly.FromDateTime(HoraArgentina.Convertir(ahora).DateTime);
        var primerDia = hoyLocal.AddDays(-(dias - 1));
        var desde = new DateTimeOffset(primerDia.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(-3)).ToUniversalTime();

        var todas = db.Denuncias.AsNoTracking();
        if (usuario.AlcanceDependencia is { } alcance)
            todas = todas.Where(d => d.DependenciaId == alcance);

        var periodo = todas.Where(d => d.CreadaEn >= desde);

        var abiertas = todas.Where(d => d.Estado != EstadoDenuncia.Resuelta && d.Estado != EstadoDenuncia.Archivada && d.Estado != EstadoDenuncia.Desestimada);
        var hace24 = ahora.AddHours(-24);

        var total = await periodo.CountAsync(ct);
        var web = await periodo.CountAsync(d => d.Origen == OrigenDenuncia.Web, ct);
        var indicadores = new IndicadoresDto(
            Total: total,
            Abiertas: await abiertas.CountAsync(ct),
            SinInstructor: await abiertas.CountAsync(d => d.OficialAsignadoId == null, ct),
            Urgentes: await abiertas.CountAsync(d => d.Prioridad == Prioridad.Urgente || d.Prioridad == Prioridad.Alta, ct),
            Ultimas24Horas: await todas.CountAsync(d => d.CreadaEn >= hace24, ct),
            CerradasEnPeriodo: await todas.CountAsync(d => d.CerradaEn >= desde, ct),
            HorasPromedioAsignacion: await PromedioAsignacionAsync(periodo, ct),
            PorcentajeWeb: total == 0 ? 0 : Math.Round(web * 100.0 / total, 1));

        // Las series se agrupan en memoria para respetar la zona horaria local.
        var altas = await periodo.Select(d => d.CreadaEn).ToListAsync(ct);
        var cierres = await todas.Where(d => d.CerradaEn >= desde).Select(d => d.CerradaEn!.Value).ToListAsync(ct);
        var altasPorDia = altas.GroupBy(Dia).ToDictionary(g => g.Key, g => g.Count());
        var cierresPorDia = cierres.GroupBy(Dia).ToDictionary(g => g.Key, g => g.Count());
        var serie = Enumerable.Range(0, dias)
            .Select(i => primerDia.AddDays(i))
            .Select(f => new SerieDto(f, altasPorDia.GetValueOrDefault(f), cierresPorDia.GetValueOrDefault(f)))
            .ToList();

        var franjas = altas
            .GroupBy(a => HoraArgentina.Convertir(a).Hour / 3)
            .ToDictionary(g => g.Key, g => g.Count());
        var porFranja = Enumerable.Range(0, 8)
            .Select(i => new CantidadDto($"{i * 3:00}–{i * 3 + 3:00} h", franjas.GetValueOrDefault(i)))
            .ToList();

        return new PanelDto(
            dias,
            usuario.AlcanceDependencia is null ? "Provincia de Tucumán" : (await db.Dependencias.Where(d => d.Id == usuario.DependenciaId).Select(d => d.Nombre).FirstOrDefaultAsync(ct) ?? ""),
            indicadores,
            serie,
            await Agrupar(periodo, d => d.Tipo, k => k.ToString(), ct),
            await Agrupar(abiertas, d => d.Estado, k => k.ToString(), ct),
            await Agrupar(periodo, d => d.Dependencia!.UnidadRegional!.Nombre, k => k ?? "Sin asignar", ct),
            (await Agrupar(periodo, d => d.Dependencia!.Nombre, k => k ?? "Sin asignar", ct)).Take(8).ToList(),
            porFranja,
            await todas
                .OrderByDescending(d => d.CreadaEn)
                .Take(8)
                .Select(d => new RecienteDto(d.Id, Denuncia.FormatearNumero(d.Correlativo, d.Anio), d.Tipo, d.Prioridad, d.Estado,
                    d.Dependencia != null ? d.Dependencia.Nombre : null, d.CreadaEn, d.Origen))
                .ToListAsync(ct));
    }

    private static DateOnly Dia(DateTimeOffset instante) => DateOnly.FromDateTime(HoraArgentina.Convertir(instante).DateTime);

    private static async Task<double?> PromedioAsignacionAsync(IQueryable<Denuncia> q, CancellationToken ct)
    {
        var tiempos = await q
            .Where(d => d.AsignadaEn != null)
            .Select(d => new { d.CreadaEn, d.AsignadaEn })
            .ToListAsync(ct);

        return tiempos.Count == 0
            ? null
            : Math.Round(tiempos.Average(t => (t.AsignadaEn!.Value - t.CreadaEn).TotalHours), 1);
    }

    private static async Task<List<CantidadDto>> Agrupar<TKey>(
        IQueryable<Denuncia> q, Expression<Func<Denuncia, TKey>> clave, Func<TKey, string> texto, CancellationToken ct)
    {
        var grupos = await q.GroupBy(clave).Select(g => new { g.Key, Cantidad = g.Count() }).ToListAsync(ct);
        return grupos
            .OrderByDescending(g => g.Cantidad)
            .Select(g => new CantidadDto(texto(g.Key), g.Cantidad))
            .ToList();
    }
}
