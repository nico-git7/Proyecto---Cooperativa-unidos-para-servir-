using System.Net.Http.Json;
using System.Text.Json;

namespace PoliciaTucuman.Infrastructure.Correo;

public sealed class ClienteMailer(HttpClient http)
{
    public async Task EnviarAsync(string destinatario, string plantilla, string datosJson, CancellationToken ct)
    {
        using var datos = JsonDocument.Parse(datosJson);
        var cuerpo = new { para = destinatario, plantilla, datos = datos.RootElement };

        using var respuesta = await http.PostAsJsonAsync("enviar", cuerpo, ct);
        if (!respuesta.IsSuccessStatusCode)
        {
            var detalle = await respuesta.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"Mailer respondió {(int)respuesta.StatusCode}: {detalle}");
        }
    }
}
