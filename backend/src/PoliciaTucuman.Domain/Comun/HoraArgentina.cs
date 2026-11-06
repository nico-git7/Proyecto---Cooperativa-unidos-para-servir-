namespace PoliciaTucuman.Domain.Comun;

public static class HoraArgentina
{
    private static readonly TimeZoneInfo Zona = ResolverZona();

    public static DateTimeOffset Convertir(DateTimeOffset instante) => TimeZoneInfo.ConvertTime(instante, Zona);

    public static int Anio(DateTimeOffset instante) => Convertir(instante).Year;

    private static TimeZoneInfo ResolverZona()
    {
        foreach (var id in new[] { "America/Argentina/Tucuman", "America/Argentina/Buenos_Aires", "Argentina Standard Time" })
        {
            if (TimeZoneInfo.TryFindSystemTimeZoneById(id, out var zona))
                return zona;
        }

        // Argentina no tiene horario de verano desde 2009.
        return TimeZoneInfo.CreateCustomTimeZone("ART", TimeSpan.FromHours(-3), "Argentina", "ART");
    }
}
