namespace PoliciaTucuman.Infrastructure.Correo;

public class OpcionesCorreo
{
    public const string Seccion = "Correo";

    /// <summary>URL interna del servicio mailer (Node + Nodemailer).</summary>
    public string UrlServicio { get; set; } = "http://localhost:4000";
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>URL pública del sitio, para armar los enlaces de los correos.</summary>
    public string UrlSitio { get; set; } = "http://localhost:5173";

    public bool DespachoHabilitado { get; set; } = true;
    public int IntervaloSegundos { get; set; } = 5;
    public int LoteMaximo { get; set; } = 20;
}
