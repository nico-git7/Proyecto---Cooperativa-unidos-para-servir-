using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Modulos.Denuncias;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Api.TiempoReal;
using PoliciaTucuman.Infrastructure.Persistencia;
using PoliciaTucuman.Infrastructure.Persistencia.Semillas;
using System.Security.Claims;

namespace PoliciaTucuman.Api;

public static class ConfiguracionApi
{
    public static IServiceCollection AddApi(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<OpcionesJwt>(configuration.GetSection(OpcionesJwt.Seccion));
        services.Configure<OpcionesSemilla>(configuration.GetSection(OpcionesSemilla.Seccion));

        services.AddHttpContextAccessor();
        services.AddScoped<UsuarioActual>();
        services.AddScoped<Auditor>();
        services.AddScoped<ServicioDenuncias>();
        services.AddSingleton<ServicioTokens>();
        services.AddSingleton<INotificadorNovedades, NotificadorNovedades>();

        services
            .AddControllers(options =>
            {
                options.ModelMetadataDetailsProviders.Add(new MensajesValidacion());
                var mensajes = options.ModelBindingMessageProvider;
                mensajes.SetValueIsInvalidAccessor(v => $"El valor '{v}' no es válido.");
                mensajes.SetAttemptedValueIsInvalidAccessor((v, _) => $"El valor '{v}' no es válido.");
                mensajes.SetNonPropertyAttemptedValueIsInvalidAccessor(v => $"El valor '{v}' no es válido.");
                mensajes.SetUnknownValueIsInvalidAccessor(_ => "El valor no es válido.");
                mensajes.SetNonPropertyUnknownValueIsInvalidAccessor(() => "El valor no es válido.");
                mensajes.SetValueMustNotBeNullAccessor(_ => "Este dato es obligatorio.");
                mensajes.SetMissingBindRequiredValueAccessor(_ => "Este dato es obligatorio.");
                mensajes.SetMissingKeyOrValueAccessor(() => "Este dato es obligatorio.");
                mensajes.SetMissingRequestBodyRequiredValueAccessor(() => "Falta el cuerpo de la solicitud.");
                mensajes.SetValueMustBeANumberAccessor(_ => "Debe ser un número.");
                mensajes.SetNonPropertyValueMustBeANumberAccessor(() => "Debe ser un número.");
            })
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
            .ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var problema = new ValidationProblemDetails(context.ModelState)
                    {
                        Title = "Revisá los datos ingresados.",
                        Status = StatusCodes.Status400BadRequest,
                        Detail = context.ModelState.Values
                            .SelectMany(v => v.Errors)
                            .Select(e => e.ErrorMessage)
                            .FirstOrDefault(m => !string.IsNullOrWhiteSpace(m) && !m.StartsWith("The JSON", StringComparison.Ordinal)),
                    };
                    return new BadRequestObjectResult(problema) { ContentTypes = { "application/problem+json" } };
                };
            });

        services.AddProblemDetails();
        services.AddExceptionHandler<ManejadorExcepciones>();

        services.AddSignalR()
            .AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

        AgregarAutenticacion(services, configuration);
        AgregarLimites(services);

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            // El nginx del contenedor web resuelve la IP real del cliente; acá se confía en un único salto.
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownNetworks.Clear();
            options.KnownProxies.Clear();
            options.ForwardLimit = 1;
        });

        services.AddHealthChecks().AddDbContextCheck<PoliciaDbContext>("base-de-datos");

        // Claves de protección de datos en el volumen, para que sobrevivan a una recreación del contenedor.
        services.AddDataProtection()
            .SetApplicationName("sgp-policia-tucuman")
            .PersistKeysToFileSystem(new DirectoryInfo(configuration["DataProtection:Ruta"] ?? "data/claves"));

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Policía de Tucumán · Sistema de Gestión Policial",
                Version = "v1",
                Description = "API de la Comisaría Virtual y de la gestión interna de denuncias, personal y móviles.",
            });
            options.CustomSchemaIds(t => t.Name);
        });

        return services;
    }

    private static void AgregarAutenticacion(IServiceCollection services, IConfiguration configuration)
    {
        var jwt = configuration.GetSection(OpcionesJwt.Seccion).Get<OpcionesJwt>() ?? new OpcionesJwt();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Emisor,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audiencia,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = ServicioTokens.ClaveDeFirma(jwt.Clave),
                    ClockSkew = TimeSpan.FromMinutes(1),
                    NameClaimType = ClaimTypes.Name,
                    RoleClaimType = ClaimTypes.Role,
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (string.IsNullOrEmpty(context.Token) &&
                            context.Request.Cookies.TryGetValue(jwt.NombreCookie, out var token))
                        {
                            context.Token = token;
                        }
                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();
    }

    private static void AgregarLimites(IServiceCollection services)
    {
        static string Ip(HttpContext context) => context.Connection.RemoteIpAddress?.ToString() ?? "desconocida";

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";
                await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Title = "Se realizaron demasiadas solicitudes. Esperá unos minutos y volvé a intentar.",
                }, ct);
            };

            options.AddPolicy(PoliticasLimite.Login, context => RateLimitPartition.GetFixedWindowLimiter(Ip(context),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));

            // Holgado a propósito: en una red compartida (oficina, evento) muchas personas salen con la misma IP.
            options.AddPolicy(PoliticasLimite.DenunciaPublica, context => RateLimitPartition.GetFixedWindowLimiter(Ip(context),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(10) }));

            options.AddPolicy(PoliticasLimite.Seguimiento, context => RateLimitPartition.GetFixedWindowLimiter(Ip(context),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 40, Window = TimeSpan.FromMinutes(1) }));
        });
    }
}
