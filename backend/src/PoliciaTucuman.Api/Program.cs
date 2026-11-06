using PoliciaTucuman.Api;
using PoliciaTucuman.Api.TiempoReal;
using PoliciaTucuman.Infrastructure;
using PoliciaTucuman.Infrastructure.Persistencia.Semillas;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfraestructura(builder.Configuration);
builder.Services.AddApi(builder.Configuration);

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Configuration.GetValue<bool>("Swagger:Habilitado"))
{
    app.UseSwagger(options => options.RouteTemplate = "api/docs/{documentName}/swagger.json");
    app.UseSwaggerUI(options =>
    {
        options.RoutePrefix = "api/docs";
        options.SwaggerEndpoint("/api/docs/v1/swagger.json", "v1");
        options.DocumentTitle = "API · Sistema de Gestión Policial";
    });
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<HubNovedades>(HubNovedades.Ruta);
app.MapHealthChecks("/api/salud");

await InicializarBaseDatosAsync(app);

app.Run();

static async Task InicializarBaseDatosAsync(WebApplication app)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    const int intentos = 10;

    // En docker la base puede tardar unos segundos más que la API en aceptar conexiones.
    for (var intento = 1; ; intento++)
    {
        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<InicializadorBaseDatos>().InicializarAsync();
            return;
        }
        catch (Exception ex) when (intento < intentos)
        {
            logger.LogWarning("No se pudo inicializar la base (intento {Intento}/{Total}): {Error}", intento, intentos, ex.Message);
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }
}

public partial class Program;
