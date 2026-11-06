using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Infrastructure.Seguridad;

namespace PoliciaTucuman.Infrastructure.Persistencia.Semillas;

/// <summary>Estructura mínima para que el sistema funcione: unidades regionales, dependencias y un administrador.</summary>
public static class SemillaBase
{
    public const string LegajoAdministrador = "10001";

    private sealed record Dep(string Ur, string Nombre, TipoDependencia Tipo, string Direccion, string Localidad, string? Telefono, double Lat, double Lng, bool Recibe = true);

    private static readonly (string Codigo, string Nombre, string Cabecera)[] Unidades =
    [
        ("URC", "Unidad Regional Capital", "San Miguel de Tucumán"),
        ("URN", "Unidad Regional Norte", "Tafí Viejo"),
        ("URE", "Unidad Regional Este", "Banda del Río Salí"),
        ("URO", "Unidad Regional Oeste", "Monteros"),
        ("URS", "Unidad Regional Sur", "Concepción"),
    ];

    private static readonly Dep[] Dependencias =
    [
        new("URC", "Jefatura de Policía", TipoDependencia.Direccion, "Av. Sarmiento 500", "San Miguel de Tucumán", "(0381) 421-0000", -26.8262, -65.2012, false),
        new("URC", "Dirección de Informática y Comunicaciones", TipoDependencia.Direccion, "Av. Sarmiento 520", "San Miguel de Tucumán", null, -26.8259, -65.2008, false),
        new("URC", "División Delitos Telemáticos", TipoDependencia.Division, "Muñecas 1050", "San Miguel de Tucumán", null, -26.8221, -65.2071, false),

        new("URC", "Comisaría Seccional 1ª", TipoDependencia.Comisaria, "Junín 650", "San Miguel de Tucumán", "(0381) 452-1001", -26.8268, -65.2085),
        new("URC", "Comisaría Seccional 2ª", TipoDependencia.Comisaria, "Av. Sarmiento 1300", "San Miguel de Tucumán", "(0381) 452-1002", -26.8178, -65.1978),
        new("URC", "Comisaría Seccional 3ª", TipoDependencia.Comisaria, "Av. Mate de Luna 2400", "San Miguel de Tucumán", "(0381) 452-1003", -26.8262, -65.2295),
        new("URC", "Comisaría Seccional 4ª", TipoDependencia.Comisaria, "Av. Roca 1800", "San Miguel de Tucumán", "(0381) 452-1004", -26.8452, -65.2162),
        new("URC", "Comisaría Seccional 5ª", TipoDependencia.Comisaria, "Av. Belgrano 2900", "San Miguel de Tucumán", "(0381) 452-1005", -26.8165, -65.2352),
        new("URC", "Comisaría Seccional 6ª", TipoDependencia.Comisaria, "Av. Avellaneda 1200", "San Miguel de Tucumán", "(0381) 452-1006", -26.8085, -65.2105),
        new("URC", "Comisaría Seccional 7ª", TipoDependencia.Comisaria, "Av. Brígido Terán 600", "San Miguel de Tucumán", "(0381) 452-1007", -26.8295, -65.1868),
        new("URC", "Comisaría Seccional 8ª", TipoDependencia.Comisaria, "Av. Independencia 2100", "San Miguel de Tucumán", "(0381) 452-1008", -26.8545, -65.2085),
        new("URC", "Comisaría Seccional 9ª", TipoDependencia.Comisaria, "Av. Colón 1500", "San Miguel de Tucumán", "(0381) 452-1009", -26.8420, -65.2395),
        new("URC", "Comisaría Seccional 10ª", TipoDependencia.Comisaria, "Av. Ejército del Norte 450", "San Miguel de Tucumán", "(0381) 452-1010", -26.8032, -65.2268),
        new("URC", "Comisaría Seccional 11ª", TipoDependencia.Comisaria, "Av. América 900", "San Miguel de Tucumán", "(0381) 452-1011", -26.8478, -65.1925),
        new("URC", "Comisaría Seccional 12ª", TipoDependencia.Comisaria, "Av. Francisco de Aguirre 1400", "San Miguel de Tucumán", "(0381) 452-1012", -26.7975, -65.1985),

        new("URN", "Comisaría de Tafí Viejo", TipoDependencia.Comisaria, "Av. Sáenz Peña 350", "Tafí Viejo", "(0381) 461-2001", -26.7322, -65.2596),
        new("URN", "Comisaría de Las Talitas", TipoDependencia.Comisaria, "Av. Juan Domingo Perón 2100", "Las Talitas", "(0381) 461-2002", -26.7830, -65.2068),
        new("URN", "Comisaría de Trancas", TipoDependencia.Comisaria, "San Martín 120", "Trancas", "(03862) 42-2003", -26.2293, -65.2838),
        new("URN", "Comisaría de Burruyacú", TipoDependencia.Comisaria, "Belgrano 80", "Burruyacú", "(0381) 461-2004", -26.4992, -64.7432),

        new("URE", "Comisaría de Banda del Río Salí", TipoDependencia.Comisaria, "Av. Independencia 400", "Banda del Río Salí", "(0381) 426-3001", -26.8352, -65.1655),
        new("URE", "Comisaría de Alderetes", TipoDependencia.Comisaria, "Av. San Martín 900", "Alderetes", "(0381) 426-3002", -26.8162, -65.1362),
        new("URE", "Comisaría de Delfín Gallo", TipoDependencia.Subcomisaria, "Rivadavia 210", "Delfín Gallo", null, -26.8412, -65.0985),
        new("URE", "Comisaría de Los Ralos", TipoDependencia.Subcomisaria, "Sarmiento 95", "Los Ralos", null, -26.8858, -65.0010),

        new("URO", "Comisaría de Yerba Buena", TipoDependencia.Comisaria, "Av. Aconquija 1700", "Yerba Buena", "(0381) 435-4001", -26.8162, -65.3155),
        new("URO", "Comisaría de Lules", TipoDependencia.Comisaria, "9 de Julio 300", "Lules", "(0381) 481-4002", -26.9282, -65.3378),
        new("URO", "Comisaría de Famaillá", TipoDependencia.Comisaria, "Belgrano 450", "Famaillá", "(03863) 46-4003", -27.0538, -65.4028),
        new("URO", "Comisaría de Monteros", TipoDependencia.Comisaria, "25 de Mayo 650", "Monteros", "(03863) 42-4004", -27.1672, -65.4982),
        new("URO", "Comisaría de Tafí del Valle", TipoDependencia.Comisaria, "Av. Miguel Critto 200", "Tafí del Valle", "(03867) 42-4005", -26.8528, -65.7095),

        new("URS", "Comisaría de Concepción", TipoDependencia.Comisaria, "España 1100", "Concepción", "(03865) 42-5001", -27.3442, -65.5928),
        new("URS", "Comisaría de Aguilares", TipoDependencia.Comisaria, "San Martín 800", "Aguilares", "(03865) 48-5002", -27.4318, -65.6152),
        new("URS", "Comisaría de Simoca", TipoDependencia.Comisaria, "Sarmiento 150", "Simoca", "(03863) 48-5003", -27.2628, -65.3562),
        new("URS", "Comisaría de Juan Bautista Alberdi", TipoDependencia.Comisaria, "Belgrano 300", "Juan Bautista Alberdi", "(03865) 47-5004", -27.5852, -65.6198),
        new("URS", "Comisaría de La Cocha", TipoDependencia.Comisaria, "San Martín 60", "La Cocha", null, -27.7718, -65.5882),
    ];

    internal static async Task AplicarAsync(PoliciaDbContext db, IHasherPasswords hasher, OpcionesSemilla opciones, DateTimeOffset ahora, CancellationToken ct)
    {
        var unidades = Unidades.ToDictionary(
            u => u.Codigo,
            u => new UnidadRegional { Codigo = u.Codigo, Nombre = u.Nombre, Cabecera = u.Cabecera });
        db.UnidadesRegionales.AddRange(unidades.Values);

        var dependencias = Dependencias.Select(d => new Dependencia
        {
            Nombre = d.Nombre,
            Tipo = d.Tipo,
            UnidadRegional = unidades[d.Ur],
            Direccion = d.Direccion,
            Localidad = d.Localidad,
            Telefono = d.Telefono,
            Latitud = d.Lat,
            Longitud = d.Lng,
            RecibeDenuncias = d.Recibe,
            Activa = true,
        }).ToList();
        db.Dependencias.AddRange(dependencias);

        var informatica = dependencias.Single(d => d.Nombre.StartsWith("Dirección de Informática"));
        var administrador = new Personal
        {
            Legajo = LegajoAdministrador,
            Apellido = "Administrador",
            Nombre = "Sistema",
            Dni = "10000001",
            Jerarquia = Jerarquia.Comisario,
            Dependencia = informatica,
            Email = opciones.EmailAdministrador,
            FechaIngreso = new DateOnly(2005, 3, 1),
        };
        db.Personal.Add(administrador);

        db.Usuarios.Add(new Usuario
        {
            Personal = administrador,
            Rol = RolUsuario.Administrador,
            PasswordHash = hasher.Hashear(opciones.PasswordInicial),
            DebeCambiarPassword = !opciones.DatosDemo,
            CreadoEn = ahora,
        });

        await db.SaveChangesAsync(ct);
    }
}
