using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Infrastructure.Correo;

/// <summary>Toma los correos pendientes de la bandeja de salida y los entrega al servicio mailer, con reintentos.</summary>
internal sealed class DespachadorCorreos(
    IServiceScopeFactory scopes,
    IOptions<OpcionesCorreo> opciones,
    TimeProvider reloj,
    ILogger<DespachadorCorreos> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var config = opciones.Value;
        if (!config.DespachoHabilitado)
        {
            logger.LogInformation("Despacho de correos deshabilitado por configuración.");
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(1, config.IntervaloSegundos)));
        do
        {
            try
            {
                await ProcesarLoteAsync(config.LoteMaximo, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error procesando la bandeja de salida de correos.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ProcesarLoteAsync(int lote, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PoliciaDbContext>();
        var mailer = scope.ServiceProvider.GetRequiredService<ClienteMailer>();

        var ahora = reloj.GetUtcNow();
        var pendientes = await db.CorreosSalientes
            .Where(c => c.Estado == EstadoCorreo.Pendiente && c.ProximoIntento <= ahora)
            .OrderBy(c => c.Id)
            .Take(lote)
            .ToListAsync(ct);

        if (pendientes.Count == 0)
            return;

        foreach (var correo in pendientes)
        {
            try
            {
                await mailer.EnviarAsync(correo.Destinatario, correo.Plantilla, correo.DatosJson, ct);
                correo.MarcarEnviado(reloj.GetUtcNow());
                logger.LogInformation("Correo {Plantilla} enviado a {Destinatario} ({Referencia})",
                    correo.Plantilla, correo.Destinatario, correo.Referencia);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                correo.RegistrarFallo(ex.Message, reloj.GetUtcNow());
                logger.LogWarning("No se pudo enviar el correo {Id} (intento {Intento}): {Error}",
                    correo.Id, correo.Intentos, ex.Message);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
