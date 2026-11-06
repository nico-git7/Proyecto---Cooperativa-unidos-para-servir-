using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PoliciaTucuman.Infrastructure.Almacenamiento;
using PoliciaTucuman.Infrastructure.Correo;
using PoliciaTucuman.Infrastructure.Persistencia;
using PoliciaTucuman.Infrastructure.Persistencia.Semillas;
using PoliciaTucuman.Infrastructure.Seguridad;

namespace PoliciaTucuman.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfraestructura(this IServiceCollection services, IConfiguration configuration)
    {
        var conexion = configuration.GetConnectionString("Principal")
            ?? throw new InvalidOperationException("Falta la cadena de conexión 'ConnectionStrings:Principal'.");

        services.AddDbContext<PoliciaDbContext>(options => options
            .UseNpgsql(conexion, npgsql => npgsql.EnableRetryOnFailure(3))
            .UseSnakeCaseNamingConvention());

        services.AddSingleton(TimeProvider.System);

        services.Configure<OpcionesCorreo>(configuration.GetSection(OpcionesCorreo.Seccion));
        services.Configure<OpcionesAlmacenamiento>(configuration.GetSection(OpcionesAlmacenamiento.Seccion));

        services.AddScoped<IColaCorreo, ColaCorreo>();
        services.AddScoped<IGeneradorCorrelativo, GeneradorCorrelativoPostgres>();
        services.AddHttpClient<ClienteMailer>((sp, http) =>
        {
            var opciones = sp.GetRequiredService<IOptions<OpcionesCorreo>>().Value;
            http.BaseAddress = new Uri(opciones.UrlServicio.TrimEnd('/') + "/");
            http.Timeout = TimeSpan.FromSeconds(20);
            if (!string.IsNullOrEmpty(opciones.ApiKey))
                http.DefaultRequestHeaders.Add("X-Api-Key", opciones.ApiKey);
        });
        services.AddHostedService<DespachadorCorreos>();

        services.AddSingleton<IAlmacenamientoArchivos, AlmacenamientoLocal>();
        services.AddSingleton<IHasherPasswords, HasherPasswords>();
        services.AddScoped<InicializadorBaseDatos>();

        return services;
    }
}
