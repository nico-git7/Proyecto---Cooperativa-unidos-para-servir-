using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using PoliciaTucuman.Api.Seguridad;

namespace PoliciaTucuman.Api.TiempoReal;

/// <summary>Canal en tiempo real para el personal: cada usuario recibe las novedades de su dependencia.</summary>
[Authorize]
public sealed class HubNovedades : Hub
{
    public const string Ruta = "/hubs/novedades";
    public const string GrupoAdministracion = "administracion";

    public static string GrupoDependencia(int dependenciaId) => $"dependencia-{dependenciaId}";

    public override async Task OnConnectedAsync()
    {
        var user = Context.User!;
        if (user.IsInRole(Roles.Administrador))
            await Groups.AddToGroupAsync(Context.ConnectionId, GrupoAdministracion);

        if (int.TryParse(user.FindFirst(Claims.DependenciaId)?.Value, out var dependenciaId))
            await Groups.AddToGroupAsync(Context.ConnectionId, GrupoDependencia(dependenciaId));

        await base.OnConnectedAsync();
    }
}
