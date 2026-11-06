using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Tests.Dominio;

internal static class Fabrica
{
    public static readonly DateTimeOffset Ahora = new(2026, 11, 6, 16, 0, 0, TimeSpan.Zero);

    public static Dependencia Seccional(int id = 1, string nombre = "Comisaría Seccional 1ª", double lat = -26.8268, double lng = -65.2085, string localidad = "San Miguel de Tucumán") =>
        new() { Id = id, Nombre = nombre, Tipo = TipoDependencia.Comisaria, Latitud = lat, Longitud = lng, Localidad = localidad, Direccion = "Junín 650" };

    public static Personal Oficial(int id = 10, int dependenciaId = 1, SituacionRevista situacion = SituacionRevista.ServicioEfectivo) =>
        new() { Id = id, Legajo = "20500", Apellido = "Gómez", Nombre = "Laura", Dni = "30111222", Jerarquia = Jerarquia.OficialInspector, DependenciaId = dependenciaId, Situacion = situacion };

    public static Denunciante Denunciante(string? email = "vecino@correo.com") =>
        new("Lucía", "Paz", "35.123.456", null, "381 5555555", email, "Laprida 450", "San Miguel de Tucumán");

    public static Denuncia Denuncia(Dependencia? dependencia = null, TipoDelito tipo = TipoDelito.Hurto, double? lat = -26.83, double? lng = -65.21,
        string relato = "Me sustrajeron la billetera mientras esperaba el colectivo en la parada.") =>
        Domain.Entidades.Denuncia.Registrar(tipo, OrigenDenuncia.Web, Denunciante(), Ahora.AddHours(-3), "24 de Septiembre 350",
            "San Miguel de Tucumán", lat, lng, relato, null, dependencia ?? Seccional(), 1, "ABCD-2345", Ahora);
}
