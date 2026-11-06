namespace PoliciaTucuman.Api.Seguridad;

/// <summary>
/// El JWT viaja en una cookie HttpOnly + SameSite=Strict: el JavaScript del sitio no puede leerlo
/// y el navegador no lo envía en pedidos originados en otros sitios.
/// </summary>
public static class CookieSesion
{
    public static void Escribir(HttpResponse response, OpcionesJwt opciones, string token, DateTimeOffset vence)
    {
        response.Cookies.Append(opciones.NombreCookie, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = response.HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = vence,
            Path = "/",
            IsEssential = true,
        });
    }

    public static void Eliminar(HttpResponse response, OpcionesJwt opciones) =>
        response.Cookies.Delete(opciones.NombreCookie, new CookieOptions { Path = "/", SameSite = SameSiteMode.Strict });
}
