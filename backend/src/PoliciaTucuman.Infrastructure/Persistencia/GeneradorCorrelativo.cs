using Microsoft.EntityFrameworkCore;

namespace PoliciaTucuman.Infrastructure.Persistencia;

public interface IGeneradorCorrelativo
{
    Task<long> SiguienteAsync(CancellationToken ct);
}

internal sealed class GeneradorCorrelativoPostgres(PoliciaDbContext db) : IGeneradorCorrelativo
{
    public async Task<long> SiguienteAsync(CancellationToken ct)
    {
        var conexion = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            await using var comando = conexion.CreateCommand();
            comando.CommandText = $"SELECT nextval('{PoliciaDbContext.SecuenciaCorrelativo}')";
            return Convert.ToInt64(await comando.ExecuteScalarAsync(ct));
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
