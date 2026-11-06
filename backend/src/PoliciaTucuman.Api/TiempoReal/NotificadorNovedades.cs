using Microsoft.AspNetCore.SignalR;

namespace PoliciaTucuman.Api.TiempoReal;

public sealed record AvisoDenuncia(int Id, string Numero, string Tipo, string Prioridad, string Estado, string? Dependencia, string Origen);

public interface INotificadorNovedades
{
    Task DenunciaRegistradaAsync(AvisoDenuncia aviso, int? dependenciaId);
    Task DenunciaActualizadaAsync(AvisoDenuncia aviso, int? dependenciaId);
}

internal sealed class NotificadorNovedades(IHubContext<HubNovedades> hub, ILogger<NotificadorNovedades> logger) : INotificadorNovedades
{
    public Task DenunciaRegistradaAsync(AvisoDenuncia aviso, int? dependenciaId) => Enviar("denunciaRegistrada", aviso, dependenciaId);

    public Task DenunciaActualizadaAsync(AvisoDenuncia aviso, int? dependenciaId) => Enviar("denunciaActualizada", aviso, dependenciaId);

    private async Task Enviar(string evento, AvisoDenuncia aviso, int? dependenciaId)
    {
        var grupos = new List<string> { HubNovedades.GrupoAdministracion };
        if (dependenciaId.HasValue)
            grupos.Add(HubNovedades.GrupoDependencia(dependenciaId.Value));

        try
        {
            await hub.Clients.Groups(grupos).SendAsync(evento, aviso);
        }
        catch (Exception ex)
        {
            // Una falla del canal en tiempo real no debe afectar la operación que ya se guardó.
            logger.LogWarning(ex, "No se pudo notificar {Evento} de la denuncia {Numero}", evento, aviso.Numero);
        }
    }
}
