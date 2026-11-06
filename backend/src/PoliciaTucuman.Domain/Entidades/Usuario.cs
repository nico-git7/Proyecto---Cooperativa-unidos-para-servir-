using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Entidades;

public class Usuario
{
    public const int MaximoIntentosFallidos = 5;
    public static readonly TimeSpan DuracionBloqueo = TimeSpan.FromMinutes(15);

    public int Id { get; set; }
    public int PersonalId { get; set; }
    public Personal? Personal { get; set; }
    public RolUsuario Rol { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public bool DebeCambiarPassword { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset? UltimoAcceso { get; set; }

    public int AccesosFallidos { get; set; }
    public DateTimeOffset? BloqueadoHasta { get; set; }

    public string? TokenRestablecimientoHash { get; set; }
    public DateTimeOffset? TokenRestablecimientoVence { get; set; }

    public bool EstaBloqueado(DateTimeOffset ahora) => BloqueadoHasta.HasValue && BloqueadoHasta.Value > ahora;

    public void RegistrarAccesoFallido(DateTimeOffset ahora)
    {
        AccesosFallidos++;
        if (AccesosFallidos >= MaximoIntentosFallidos)
        {
            BloqueadoHasta = ahora.Add(DuracionBloqueo);
            AccesosFallidos = 0;
        }
    }

    public void RegistrarAccesoCorrecto(DateTimeOffset ahora)
    {
        AccesosFallidos = 0;
        BloqueadoHasta = null;
        UltimoAcceso = ahora;
    }

    public void EstablecerPassword(string hash, bool temporal)
    {
        PasswordHash = hash;
        DebeCambiarPassword = temporal;
        TokenRestablecimientoHash = null;
        TokenRestablecimientoVence = null;
        AccesosFallidos = 0;
        BloqueadoHasta = null;
    }
}
