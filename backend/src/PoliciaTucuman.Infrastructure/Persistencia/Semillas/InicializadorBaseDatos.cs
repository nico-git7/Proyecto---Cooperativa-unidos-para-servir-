using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PoliciaTucuman.Infrastructure.Seguridad;

namespace PoliciaTucuman.Infrastructure.Persistencia.Semillas;

public sealed class InicializadorBaseDatos(
    PoliciaDbContext db,
    IHasherPasswords hasher,
    IConfiguration configuration,
    TimeProvider reloj,
    ILogger<InicializadorBaseDatos> logger)
{
    public async Task InicializarAsync(CancellationToken ct = default)
    {
        var opciones = configuration.GetSection(OpcionesSemilla.Seccion).Get<OpcionesSemilla>() ?? new OpcionesSemilla();

        logger.LogInformation("Aplicando migraciones de base de datos...");
        await db.Database.MigrateAsync(ct);

        if (!await db.UnidadesRegionales.AnyAsync(ct))
        {
            logger.LogInformation("Cargando estructura orgánica y usuario administrador.");
            await SemillaBase.AplicarAsync(db, hasher, opciones, reloj.GetUtcNow(), ct);
        }

        if (opciones.DatosDemo && !await db.Denuncias.AnyAsync(ct))
        {
            logger.LogInformation("Cargando datos de demostración.");
            await SemillaDemo.AplicarAsync(db, hasher, opciones, reloj.GetUtcNow(), ct);
        }
    }
}
