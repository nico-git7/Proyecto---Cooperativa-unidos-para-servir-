namespace PoliciaTucuman.Infrastructure.Almacenamiento;

public class OpcionesAlmacenamiento
{
    public const string Seccion = "Almacenamiento";

    public string Ruta { get; set; } = "data/adjuntos";
    public long TamanoMaximoBytes { get; set; } = 10 * 1024 * 1024;
}
