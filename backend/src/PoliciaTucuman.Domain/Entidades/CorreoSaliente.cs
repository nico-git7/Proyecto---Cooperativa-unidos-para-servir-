using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Entidades;

/// <summary>
/// Bandeja de salida (patrón outbox): el correo se guarda en la misma transacción que la operación
/// que lo origina y un proceso en segundo plano lo entrega al servicio de envío.
/// </summary>
public class CorreoSaliente
{
    public const int MaximoIntentos = 6;

    public long Id { get; set; }
    public string Destinatario { get; set; } = string.Empty;
    public string Plantilla { get; set; } = string.Empty;
    public string DatosJson { get; set; } = "{}";
    public string? Referencia { get; set; }
    public EstadoCorreo Estado { get; set; } = EstadoCorreo.Pendiente;
    public int Intentos { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset ProximoIntento { get; set; }
    public DateTimeOffset? EnviadoEn { get; set; }
    public string? UltimoError { get; set; }

    public void MarcarEnviado(DateTimeOffset ahora)
    {
        Estado = EstadoCorreo.Enviado;
        EnviadoEn = ahora;
        UltimoError = null;
        Intentos++;
    }

    public void RegistrarFallo(string error, DateTimeOffset ahora)
    {
        Intentos++;
        UltimoError = error.Length > 500 ? error[..500] : error;

        if (Intentos >= MaximoIntentos)
        {
            Estado = EstadoCorreo.Fallido;
            return;
        }

        // 30 s, 1 min, 2 min, 4 min, 8 min
        ProximoIntento = ahora.AddSeconds(30 * Math.Pow(2, Intentos - 1));
    }
}
