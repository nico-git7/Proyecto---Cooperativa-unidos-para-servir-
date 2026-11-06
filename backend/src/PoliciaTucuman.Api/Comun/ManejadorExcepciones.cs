using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PoliciaTucuman.Domain.Comun;

namespace PoliciaTucuman.Api.Comun;

/// <summary>Traduce las excepciones a respuestas ProblemDetails (RFC 7807) con mensajes en castellano.</summary>
public sealed class ManejadorExcepciones(IProblemDetailsService problemDetails, ILogger<ManejadorExcepciones> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (estado, titulo) = exception switch
        {
            ReglaNegocioException e => (StatusCodes.Status422UnprocessableEntity, e.Message),
            NoEncontradoException e => (StatusCodes.Status404NotFound, e.Message),
            AccesoDenegadoException e => (StatusCodes.Status403Forbidden, e.Message),
            ConflictoException e => (StatusCodes.Status409Conflict, e.Message),
            DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } } =>
                (StatusCodes.Status409Conflict, "Ya existe un registro con esos datos."),
            BadHttpRequestException e => (e.StatusCode, "La solicitud no es válida."),
            _ => (StatusCodes.Status500InternalServerError, "Ocurrió un error inesperado. Intente nuevamente."),
        };

        if (estado >= 500)
            logger.LogError(exception, "Error no controlado en {Metodo} {Ruta}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = estado;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exception,
            ProblemDetails = new ProblemDetails { Status = estado, Title = titulo },
        });
    }
}
