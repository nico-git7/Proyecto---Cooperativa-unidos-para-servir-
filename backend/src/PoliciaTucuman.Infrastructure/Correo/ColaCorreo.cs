using System.Text.Json;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Infrastructure.Correo;

public interface IColaCorreo
{
    /// <summary>
    /// Agrega el correo al contexto actual. Se persiste con el próximo SaveChanges, junto con la operación que lo genera.
    /// </summary>
    void Encolar(string destinatario, string plantilla, object datos, string? referencia = null);
}

internal sealed class ColaCorreo(PoliciaDbContext db, TimeProvider reloj) : IColaCorreo
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public void Encolar(string destinatario, string plantilla, object datos, string? referencia = null)
    {
        if (string.IsNullOrWhiteSpace(destinatario))
            return;

        var ahora = reloj.GetUtcNow();
        db.CorreosSalientes.Add(new CorreoSaliente
        {
            Destinatario = destinatario.Trim(),
            Plantilla = plantilla,
            DatosJson = JsonSerializer.Serialize(datos, Json),
            Referencia = referencia,
            CreadoEn = ahora,
            ProximoIntento = ahora,
        });
    }
}
