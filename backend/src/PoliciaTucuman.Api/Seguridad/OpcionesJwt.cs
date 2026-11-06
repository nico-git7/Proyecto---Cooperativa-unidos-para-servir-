namespace PoliciaTucuman.Api.Seguridad;

public class OpcionesJwt
{
    public const string Seccion = "Jwt";

    public string Emisor { get; set; } = "sgp-policia-tucuman";
    public string Audiencia { get; set; } = "sgp-policia-tucuman";

    /// <summary>Clave HMAC de al menos 32 caracteres. En producción se define por variable de entorno.</summary>
    public string Clave { get; set; } = string.Empty;

    public int DuracionHoras { get; set; } = 10;
    public string NombreCookie { get; set; } = "sgp_sesion";
}
