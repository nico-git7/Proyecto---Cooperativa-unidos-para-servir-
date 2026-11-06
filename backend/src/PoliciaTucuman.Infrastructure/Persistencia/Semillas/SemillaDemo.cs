using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;
using PoliciaTucuman.Infrastructure.Seguridad;

namespace PoliciaTucuman.Infrastructure.Persistencia.Semillas;

/// <summary>
/// Datos ficticios para demostración: personal, móviles y seis meses de denuncias con su historial.
/// Usa una semilla fija para que cada instalación genere exactamente los mismos datos.
/// </summary>
public static class SemillaDemo
{
    public const string LegajoJefeDemo = "20001";
    public const string LegajoOperadorDemo = "20002";

    private const int CantidadDenuncias = 420;
    private const int DiasHistorial = 180;

    private static readonly string[] Apellidos =
    [
        "Díaz", "Gómez", "Rodríguez", "Fernández", "López", "Martínez", "González", "Pérez", "Sánchez", "Romero",
        "Juárez", "Medina", "Herrera", "Paz", "Ruiz", "Ledesma", "Albornoz", "Aráoz", "Villagra", "Robles",
        "Coronel", "Figueroa", "Toledo", "Carrizo", "Lazarte", "Chávez", "Soria", "Nieva", "Brito", "Costilla",
        "Ibáñez", "Agüero", "Ríos", "Acosta", "Galván", "Luna", "Ponce", "Gerez", "Ojeda", "Moreno",
        "Navarro", "Córdoba", "Palacios", "Quiroga", "Reyes", "Vega", "Zelaya", "Frías", "Bustos", "Santillán",
    ];

    private static readonly string[] NombresMasculinos =
    [
        "Juan", "Carlos", "José", "Luis", "Miguel", "Jorge", "Ramón", "Walter", "Sergio", "Daniel", "Marcelo",
        "Gustavo", "Diego", "Pablo", "Federico", "Matías", "Nicolás", "Lucas", "Facundo", "Gonzalo", "Esteban",
        "Hugo", "Raúl", "Héctor", "Ricardo",
    ];

    private static readonly string[] NombresFemeninos =
    [
        "María", "Ana", "Laura", "Silvia", "Claudia", "Gabriela", "Marcela", "Verónica", "Lorena", "Paola",
        "Romina", "Carolina", "Florencia", "Natalia", "Valeria", "Andrea", "Sofía", "Daniela", "Mónica",
        "Patricia", "Julieta", "Agustina", "Camila", "Rocío", "Noelia",
    ];

    private static readonly string[] CallesCapital =
    [
        "San Martín", "24 de Septiembre", "Mendoza", "Córdoba", "Maipú", "Laprida", "Junín", "Muñecas", "Las Heras",
        "Crisóstomo Álvarez", "Congreso", "Rivadavia", "Santiago del Estero", "Marcos Paz", "Lamadrid", "Chacabuco",
        "Buenos Aires", "Catamarca", "La Rioja", "Salta", "Jujuy", "Av. Mate de Luna", "Av. Sarmiento", "Av. Mitre",
        "Av. Alem", "Av. Roca", "Av. Avellaneda", "Av. Brígido Terán", "Av. Independencia", "Av. Colón",
        "Av. Belgrano", "Av. América", "Av. Siria", "Av. Ejército del Norte", "Av. Gobernador del Campo",
    ];

    private static readonly string[] CallesInterior =
    [
        "San Martín", "Belgrano", "Rivadavia", "Sarmiento", "9 de Julio", "25 de Mayo", "Moreno", "Mitre",
        "Lavalle", "Alberdi", "Independencia", "Las Heras", "Avellaneda", "España", "Italia",
    ];

    private static readonly (TipoDelito Tipo, int Peso)[] DistribucionTipos =
    [
        (TipoDelito.Hurto, 21), (TipoDelito.Robo, 17), (TipoDelito.RoboMotocicleta, 14), (TipoDelito.EstafaVirtual, 12),
        (TipoDelito.ExtravioDocumentacion, 9), (TipoDelito.Amenazas, 8), (TipoDelito.Danos, 6), (TipoDelito.Lesiones, 4),
        (TipoDelito.RoboAutomotor, 3), (TipoDelito.Estafa, 3), (TipoDelito.ViolenciaFamiliar, 2), (TipoDelito.Otro, 1),
    ];

    private static readonly string[] NotasInvestigacion =
    [
        "Se recibió declaración testimonial al denunciante.",
        "Se solicitaron registros fílmicos a comercios de la zona.",
        "Se comisionó personal al lugar del hecho para relevamiento de cámaras y testigos.",
        "Se libró oficio a la empresa de telefonía solicitando información.",
        "Se dio intervención a la Unidad Fiscal correspondiente.",
        "Se realizó inspección ocular en el lugar del hecho.",
        "Se consultó la base de datos de rodados con pedido de secuestro.",
        "Se cargó el objeto sustraído en el registro de bienes con pedido de secuestro.",
    ];

    internal static async Task AplicarAsync(PoliciaDbContext db, IHasherPasswords hasher, OpcionesSemilla opciones, DateTimeOffset ahora, CancellationToken ct)
    {
        var random = new Random(2026);
        var dependencias = await db.Dependencias.Include(d => d.UnidadRegional).OrderBy(d => d.Id).ToListAsync(ct);
        var territoriales = dependencias.Where(d => d.RecibeDenuncias).ToList();
        var passwordHash = hasher.Hashear(opciones.PasswordInicial);

        var admin = await db.Personal.SingleAsync(p => p.Legajo == SemillaBase.LegajoAdministrador, ct);
        admin.Apellido = "Medina";
        admin.Nombre = "Ricardo Alberto";
        admin.Jerarquia = Jerarquia.ComisarioInspector;

        var generador = new GeneradorPersonas(random);
        var personalPorDependencia = CrearPersonal(db, dependencias, generador, random);
        var jefes = CrearUsuarios(db, personalPorDependencia, passwordHash, ahora);
        CrearMoviles(db, territoriales, random);
        await db.SaveChangesAsync(ct);

        var denuncias = CrearDenuncias(territoriales, personalPorDependencia, jefes, generador, random, ahora);

        db.Denuncias.AddRange(denuncias);
        await db.SaveChangesAsync(ct);

        // Los correlativos se asignaron en orden cronológico; la secuencia sigue desde el último.
        long ultimo = denuncias.Count;
        await db.Database.ExecuteSqlAsync($"SELECT setval('denuncias_correlativo_seq', {ultimo})", ct);
    }

    private static Dictionary<int, List<Personal>> CrearPersonal(PoliciaDbContext db, List<Dependencia> dependencias, GeneradorPersonas generador, Random random)
    {
        var resultado = new Dictionary<int, List<Personal>>();
        var legajo = 20000;

        foreach (var dependencia in dependencias)
        {
            var lista = new List<Personal>();
            var esCapital = dependencia.UnidadRegional!.Codigo == "URC";
            var cantidad = dependencia.Tipo switch
            {
                TipoDependencia.Direccion => 3,
                TipoDependencia.Division => 5,
                TipoDependencia.Subcomisaria => 4,
                _ => esCapital ? 9 : 6,
            };

            for (var i = 0; i < cantidad; i++)
            {
                var jerarquia = i switch
                {
                    0 when dependencia.Tipo == TipoDependencia.Subcomisaria => Jerarquia.Subcomisario,
                    0 => esCapital ? Jerarquia.Comisario : Elegir(random, Jerarquia.Comisario, Jerarquia.Subcomisario),
                    1 => Elegir(random, Jerarquia.OficialPrincipal, Jerarquia.OficialInspector),
                    2 or 3 => Elegir(random, Jerarquia.OficialInspector, Jerarquia.OficialSubinspector, Jerarquia.OficialAyudante),
                    _ => Elegir(random, Jerarquia.SargentoPrimero, Jerarquia.Sargento, Jerarquia.CaboPrimero, Jerarquia.Cabo, Jerarquia.Agente, Jerarquia.Agente),
                };

                var persona = generador.Nueva();
                var situacion = i > 1 && random.NextDouble() < 0.06 ? SituacionRevista.Licencia : SituacionRevista.ServicioEfectivo;
                var antiguedad = jerarquia switch
                {
                    >= Jerarquia.Comisario => random.Next(20, 28),
                    >= Jerarquia.OficialPrincipal => random.Next(12, 20),
                    >= Jerarquia.OficialAyudante => random.Next(2, 12),
                    _ => random.Next(1, 15),
                };

                legajo += random.Next(7, 60);
                var efectivo = new Personal
                {
                    Legajo = legajo.ToString(),
                    Apellido = persona.Apellido,
                    Nombre = persona.Nombre,
                    Dni = persona.Dni,
                    Jerarquia = jerarquia,
                    Situacion = situacion,
                    Dependencia = dependencia,
                    Telefono = $"381 5{random.Next(10, 99)}-{random.Next(1000, 9999)}",
                    FechaIngreso = new DateOnly(DateTime.Today.Year - antiguedad, random.Next(1, 13), 1),
                };
                lista.Add(efectivo);
            }

            resultado[dependencia.Id] = lista;
            db.Personal.AddRange(lista);
        }

        // Legajos fijos y fáciles de recordar para la demo en la Seccional 1ª.
        var seccional1 = dependencias.Single(d => d.Nombre == "Comisaría Seccional 1ª");
        resultado[seccional1.Id][0].Legajo = LegajoJefeDemo;
        resultado[seccional1.Id][1].Legajo = LegajoOperadorDemo;
        resultado[seccional1.Id][1].Situacion = SituacionRevista.ServicioEfectivo;

        return resultado;
    }

    private static Dictionary<int, Usuario> CrearUsuarios(PoliciaDbContext db, Dictionary<int, List<Personal>> personal, string passwordHash, DateTimeOffset ahora)
    {
        var jefes = new Dictionary<int, Usuario>();
        foreach (var (dependenciaId, lista) in personal)
        {
            var jefe = new Usuario
            {
                Personal = lista[0],
                Rol = RolUsuario.JefeDependencia,
                PasswordHash = passwordHash,
                CreadoEn = ahora.AddDays(-DiasHistorial - 30),
            };
            jefes[dependenciaId] = jefe;
            db.Usuarios.Add(jefe);

            if (lista[1].Legajo == LegajoOperadorDemo)
            {
                db.Usuarios.Add(new Usuario
                {
                    Personal = lista[1],
                    Rol = RolUsuario.Operador,
                    PasswordHash = passwordHash,
                    CreadoEn = ahora.AddDays(-DiasHistorial - 30),
                });
            }
        }
        return jefes;
    }

    private static void CrearMoviles(PoliciaDbContext db, List<Dependencia> dependencias, Random random)
    {
        (TipoMovil Tipo, string Marca, string Modelo)[] modelos =
        [
            (TipoMovil.Camioneta, "Toyota", "Hilux 4x4 DX"),
            (TipoMovil.Camioneta, "Ford", "Ranger XL"),
            (TipoMovil.Automovil, "Toyota", "Etios XS"),
            (TipoMovil.Automovil, "Chevrolet", "Prisma LT"),
            (TipoMovil.Automovil, "Volkswagen", "Voyage"),
            (TipoMovil.Motocicleta, "Honda", "XR 250 Tornado"),
            (TipoMovil.Motocicleta, "Yamaha", "XTZ 250"),
            (TipoMovil.Utilitario, "Renault", "Kangoo"),
        ];

        var interno = 1100;
        var usados = new HashSet<string>();
        foreach (var dependencia in dependencias)
        {
            var cantidad = dependencia.UnidadRegional!.Codigo == "URC" ? random.Next(3, 6) : random.Next(2, 4);
            for (var i = 0; i < cantidad; i++)
            {
                var modelo = modelos[random.Next(modelos.Length)];
                var anio = random.Next(2016, 2026);
                string dominio;
                do
                {
                    dominio = modelo.Tipo == TipoMovil.Motocicleta
                        ? $"A{random.Next(100, 999)}{Letras(random, 3)}"
                        : $"A{Letras(random, 1)}{random.Next(100, 999)}{Letras(random, 2)}";
                } while (!usados.Add(dominio));

                var estado = random.NextDouble() switch
                {
                    < 0.55 => EstadoMovil.Operativo,
                    < 0.82 => EstadoMovil.EnPatrullaje,
                    < 0.95 => EstadoMovil.EnTaller,
                    _ => EstadoMovil.FueraDeServicio,
                };

                interno += random.Next(1, 9);
                db.Moviles.Add(new Movil
                {
                    NumeroInterno = $"{(modelo.Tipo == TipoMovil.Motocicleta ? "MT" : "M")}-{interno}",
                    Dominio = dominio,
                    Tipo = modelo.Tipo,
                    Marca = modelo.Marca,
                    Modelo = modelo.Modelo,
                    Anio = anio,
                    Estado = estado,
                    Dependencia = dependencia,
                    Kilometraje = (2026 - anio) * random.Next(18_000, 42_000) + random.Next(0, 9_000),
                    Observaciones = estado == EstadoMovil.EnTaller ? "Service programado y cambio de neumáticos." : null,
                });
            }
        }
    }

    private static List<Denuncia> CrearDenuncias(
        List<Dependencia> dependencias,
        Dictionary<int, List<Personal>> personal,
        Dictionary<int, Usuario> jefes,
        GeneradorPersonas generador,
        Random random,
        DateTimeOffset ahora)
    {
        // La capital concentra la mayor parte de las denuncias.
        var pesos = dependencias.Select(d => d.UnidadRegional!.Codigo == "URC" ? 10 : d.Tipo == TipoDependencia.Subcomisaria ? 1 : 3).ToArray();
        var totalPesos = pesos.Sum();
        var lista = new List<Denuncia>(CantidadDenuncias);

        // Más volumen en los últimos meses y en horario diurno. Las fechas se ordenan antes de generar
        // para que el correlativo acompañe a la fecha de alta.
        var altas = Enumerable.Range(0, CantidadDenuncias)
            .Select(_ =>
            {
                var diasAtras = Math.Pow(random.NextDouble(), 1.25) * DiasHistorial;
                var creada = ahora.AddDays(-diasAtras);
                if (HoraArgentinaDe(creada).Hour < 7 && random.NextDouble() < 0.7)
                    creada = creada.AddHours(random.Next(7, 12));
                if (creada > ahora)
                    creada = ahora.AddMinutes(-random.Next(5, 90));
                return creada;
            })
            .OrderBy(c => c)
            .ToArray();

        for (var i = 0; i < CantidadDenuncias; i++)
        {
            var dependencia = ElegirPonderado(dependencias, pesos, totalPesos, random);
            var tipo = ElegirTipo(random);
            var creada = altas[i];
            var diasAtras = (ahora - creada).TotalDays;

            var fechaHecho = creada.AddHours(-(0.5 + random.NextDouble() * 36));
            var radio = dependencia.UnidadRegional!.Codigo == "URC" ? 0.012 : 0.02;
            var lat = dependencia.Latitud!.Value + Gauss(random) * radio;
            var lng = dependencia.Longitud!.Value + Gauss(random) * radio;

            var persona = generador.Nueva();
            var calles = dependencia.Localidad == "San Miguel de Tucumán" ? CallesCapital : CallesInterior;
            var lugar = $"{calles[random.Next(calles.Length)]} {random.Next(1, 40) * 100 + random.Next(0, 99)}";
            var domicilio = $"{calles[random.Next(calles.Length)]} {random.Next(1, 30) * 100 + random.Next(0, 99)}";
            var bien = Relatos.Bien(tipo, random);

            var denunciante = new Denunciante(
                persona.Nombre, persona.Apellido, persona.Dni,
                DateOnly.FromDateTime(DateTime.Today.AddYears(-random.Next(19, 70)).AddDays(-random.Next(0, 365))),
                $"381 {random.Next(4, 7)}{random.Next(10, 99)}-{random.Next(1000, 9999)}",
                null, domicilio, dependencia.Localidad);

            var origen = random.NextDouble() < 0.58 ? OrigenDenuncia.Web : OrigenDenuncia.Presencial;
            var jefe = jefes[dependencia.Id];

            var denuncia = Denuncia.Registrar(
                tipo, origen, denunciante, fechaHecho, lugar, dependencia.Localidad, Math.Round(lat, 6), Math.Round(lng, 6),
                Relatos.Generar(tipo, lugar, HoraArgentinaDe(fechaHecho), bien, random), bien, dependencia,
                i + 1, CodigoSeguimiento.Generar(), creada, origen == OrigenDenuncia.Presencial ? jefe.Id : null);

            AplicarHistorial(denuncia, personal[dependencia.Id], jefe.Id, diasAtras, random, creada, ahora);
            lista.Add(denuncia);
        }

        return lista;
    }

    private static void AplicarHistorial(Denuncia denuncia, List<Personal> personal, int usuarioId,
        double diasAtras, Random random, DateTimeOffset creada, DateTimeOffset ahora)
    {
        var destino = EstadoObjetivo(denuncia.Tipo, diasAtras, random);
        if (destino == EstadoDenuncia.Recibida)
            return;

        var instante = creada;
        var margen = ahora - creada;

        DateTimeOffset Avanzar(double fraccionMaxima)
        {
            var paso = TimeSpan.FromMinutes(20 + random.NextDouble() * Math.Max(30, margen.TotalMinutes * fraccionMaxima));
            instante = instante.Add(paso);
            if (instante > ahora.AddMinutes(-2))
                instante = ahora.AddMinutes(-2);
            return instante;
        }

        if (destino == EstadoDenuncia.Desestimada)
        {
            denuncia.CambiarEstado(EstadoDenuncia.Desestimada,
                "Los hechos relatados no constituyen delito. Se orienta al denunciante hacia la vía civil.", usuarioId, Avanzar(0.1));
            return;
        }

        var instructores = personal.Skip(1).Where(p => p.EsOficial && p.PuedeInstruir).ToList();
        var instructor = instructores.Count > 0 ? instructores[random.Next(instructores.Count)] : personal[0];
        denuncia.AsignarOficial(instructor, usuarioId, Avanzar(0.05));
        if (destino == EstadoDenuncia.Asignada)
            return;

        if (denuncia.Tipo == TipoDelito.ExtravioDocumentacion)
        {
            denuncia.CambiarEstado(EstadoDenuncia.Resuelta, "Se expidió la constancia de extravío.", usuarioId, Avanzar(0.05));
            return;
        }

        denuncia.CambiarEstado(EstadoDenuncia.EnInvestigacion, null, usuarioId, Avanzar(0.08));

        var notas = random.Next(1, 4);
        foreach (var nota in NotasInvestigacion.OrderBy(_ => random.Next()).Take(notas))
            denuncia.AgregarNota(nota, false, usuarioId, Avanzar(0.12));

        if (destino == EstadoDenuncia.EnInvestigacion)
            return;

        if (destino == EstadoDenuncia.Archivada)
        {
            denuncia.CambiarEstado(EstadoDenuncia.Archivada,
                "Agotadas las medidas de investigación sin identificar a los autores. Se archiva sin perjuicio de su reapertura.",
                usuarioId, Avanzar(0.2));
            return;
        }

        denuncia.CambiarEstado(EstadoDenuncia.ElevadaFiscalia, "Se elevan las actuaciones a la Unidad Fiscal en turno.", usuarioId, Avanzar(0.15));
        if (destino == EstadoDenuncia.ElevadaFiscalia)
            return;

        var cierre = denuncia.Tipo is TipoDelito.RoboAutomotor or TipoDelito.RoboMotocicleta && random.NextDouble() < 0.6
            ? "Se recuperó el rodado y se hizo entrega al titular."
            : "Se identificó a los autores. Las actuaciones continúan en sede judicial.";
        denuncia.CambiarEstado(EstadoDenuncia.Resuelta, cierre, usuarioId, Avanzar(0.2));
    }

    private static EstadoDenuncia EstadoObjetivo(TipoDelito tipo, double diasAtras, Random random)
    {
        var r = random.NextDouble();
        if (r < 0.025 && tipo != TipoDelito.ViolenciaFamiliar)
            return EstadoDenuncia.Desestimada;

        return diasAtras switch
        {
            < 1.5 => r < 0.6 ? EstadoDenuncia.Recibida : EstadoDenuncia.Asignada,
            < 7 => r switch { < 0.12 => EstadoDenuncia.Recibida, < 0.40 => EstadoDenuncia.Asignada, < 0.88 => EstadoDenuncia.EnInvestigacion, _ => EstadoDenuncia.ElevadaFiscalia },
            < 45 => r switch { < 0.05 => EstadoDenuncia.Asignada, < 0.40 => EstadoDenuncia.EnInvestigacion, < 0.68 => EstadoDenuncia.ElevadaFiscalia, < 0.86 => EstadoDenuncia.Resuelta, _ => EstadoDenuncia.Archivada },
            _ => r switch { < 0.08 => EstadoDenuncia.EnInvestigacion, < 0.32 => EstadoDenuncia.ElevadaFiscalia, < 0.70 => EstadoDenuncia.Resuelta, _ => EstadoDenuncia.Archivada },
        };
    }

    private static TipoDelito ElegirTipo(Random random)
    {
        var total = DistribucionTipos.Sum(t => t.Peso);
        var valor = random.Next(total);
        foreach (var (tipo, peso) in DistribucionTipos)
        {
            if (valor < peso) return tipo;
            valor -= peso;
        }
        return TipoDelito.Otro;
    }

    private static T ElegirPonderado<T>(List<T> elementos, int[] pesos, int total, Random random)
    {
        var valor = random.Next(total);
        for (var i = 0; i < elementos.Count; i++)
        {
            if (valor < pesos[i]) return elementos[i];
            valor -= pesos[i];
        }
        return elementos[^1];
    }

    private static T Elegir<T>(Random random, params T[] opciones) => opciones[random.Next(opciones.Length)];

    private static string Letras(Random random, int cantidad) =>
        new(Enumerable.Range(0, cantidad).Select(_ => (char)('A' + random.Next(26))).ToArray());

    private static double Gauss(Random random)
    {
        var u1 = 1.0 - random.NextDouble();
        var u2 = random.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2) * 0.6;
    }

    private static DateTimeOffset HoraArgentinaDe(DateTimeOffset instante) => Domain.Comun.HoraArgentina.Convertir(instante);

    private sealed class GeneradorPersonas(Random random)
    {
        private readonly HashSet<string> _dnis = [];

        public (string Nombre, string Apellido, string Dni) Nueva()
        {
            var femenino = random.NextDouble() < 0.48;
            var nombres = femenino ? NombresFemeninos : NombresMasculinos;
            var nombre = nombres[random.Next(nombres.Length)];
            if (random.NextDouble() < 0.35)
            {
                var segundo = nombres[random.Next(nombres.Length)];
                if (segundo != nombre)
                    nombre += " " + segundo;
            }

            string dni;
            do
            {
                dni = random.Next(18_000_000, 46_000_000).ToString();
            } while (!_dnis.Add(dni));

            return (nombre, Apellidos[random.Next(Apellidos.Length)], dni);
        }
    }
}
