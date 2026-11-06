using Microsoft.Extensions.Options;
using PoliciaTucuman.Domain.Comun;

namespace PoliciaTucuman.Infrastructure.Almacenamiento;

public sealed record ArchivoGuardado(string Ruta, string ContentType, long TamanoBytes);

public interface IAlmacenamientoArchivos
{
    Task<ArchivoGuardado> GuardarAsync(Stream contenido, CancellationToken ct);
    Stream? Abrir(string ruta);
    void Eliminar(string ruta);
}

/// <summary>Guarda los adjuntos en disco (volumen del contenedor), organizados por año y mes.</summary>
internal sealed class AlmacenamientoLocal(IOptions<OpcionesAlmacenamiento> opciones, TimeProvider reloj) : IAlmacenamientoArchivos
{
    private readonly string _raiz = Path.GetFullPath(opciones.Value.Ruta);
    private readonly long _maximo = opciones.Value.TamanoMaximoBytes;

    public async Task<ArchivoGuardado> GuardarAsync(Stream contenido, CancellationToken ct)
    {
        var cabecera = new byte[16];
        var leidos = await contenido.ReadAtLeastAsync(cabecera, cabecera.Length, throwOnEndOfStream: false, ct);
        var tipo = TiposArchivo.Detectar(cabecera.AsSpan(0, leidos))
                   ?? throw new ReglaNegocioException($"Formato de archivo no admitido. Se aceptan {TiposArchivo.Aceptados}.");

        var ahora = reloj.GetUtcNow();
        var relativa = Path.Combine(ahora.ToString("yyyy"), ahora.ToString("MM"), $"{Guid.NewGuid():N}{tipo.Extension}");
        var destino = Path.Combine(_raiz, relativa);
        Directory.CreateDirectory(Path.GetDirectoryName(destino)!);

        long total = leidos;
        try
        {
            await using var salida = new FileStream(destino, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
            await salida.WriteAsync(cabecera.AsMemory(0, leidos), ct);

            var buffer = new byte[81920];
            int n;
            while ((n = await contenido.ReadAsync(buffer, ct)) > 0)
            {
                total += n;
                if (total > _maximo)
                    throw new ReglaNegocioException($"Cada archivo puede pesar hasta {_maximo / (1024 * 1024)} MB.");
                await salida.WriteAsync(buffer.AsMemory(0, n), ct);
            }
        }
        catch
        {
            File.Delete(destino);
            throw;
        }

        return new ArchivoGuardado(relativa.Replace('\\', '/'), tipo.ContentType, total);
    }

    public Stream? Abrir(string ruta)
    {
        var completa = Resolver(ruta);
        return File.Exists(completa) ? File.OpenRead(completa) : null;
    }

    public void Eliminar(string ruta)
    {
        var completa = Resolver(ruta);
        if (File.Exists(completa))
            File.Delete(completa);
    }

    private string Resolver(string ruta)
    {
        var completa = Path.GetFullPath(Path.Combine(_raiz, ruta));
        if (!completa.StartsWith(_raiz, StringComparison.Ordinal))
            throw new InvalidOperationException("Ruta de archivo fuera del almacenamiento.");
        return completa;
    }
}
