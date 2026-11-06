using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Domain.Reglas;

public static class Geografia
{
    private const double RadioTierraKm = 6371.0;

    // Rectángulo que contiene a la provincia con un margen razonable.
    private const double LatitudNorte = -26.0;
    private const double LatitudSur = -28.05;
    private const double LongitudOeste = -66.25;
    private const double LongitudEste = -64.45;

    public static bool EstaEnTucuman(double latitud, double longitud) =>
        latitud is <= LatitudNorte and >= LatitudSur &&
        longitud is >= LongitudOeste and <= LongitudEste;

    public static double DistanciaKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ARadianes(lat2 - lat1);
        var dLon = ARadianes(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ARadianes(lat1)) * Math.Cos(ARadianes(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return RadioTierraKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    /// <summary>
    /// Jurisdicción para una denuncia nueva: la dependencia territorial más cercana al lugar del hecho.
    /// Sin coordenadas, se toma la primera dependencia de la localidad informada.
    /// </summary>
    public static Dependencia? ResolverJurisdiccion(IEnumerable<Dependencia> dependencias, double? latitud, double? longitud, string? localidad)
    {
        var candidatas = dependencias.Where(d => d.Activa && d.RecibeDenuncias).ToList();
        if (candidatas.Count == 0)
            return null;

        if (latitud.HasValue && longitud.HasValue)
        {
            return candidatas
                .Where(d => d.TieneUbicacion)
                .MinBy(d => DistanciaKm(latitud.Value, longitud.Value, d.Latitud!.Value, d.Longitud!.Value));
        }

        if (!string.IsNullOrWhiteSpace(localidad))
        {
            var buscada = Texto.SinAcentos(localidad.Trim());
            return candidatas
                .Where(d => string.Equals(Texto.SinAcentos(d.Localidad), buscada, StringComparison.OrdinalIgnoreCase))
                .OrderBy(d => d.Tipo)
                .ThenBy(d => d.Id)
                .FirstOrDefault();
        }

        return null;
    }

    private static double ARadianes(double grados) => grados * Math.PI / 180.0;
}
