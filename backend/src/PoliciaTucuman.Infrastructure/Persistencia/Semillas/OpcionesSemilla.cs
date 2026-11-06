namespace PoliciaTucuman.Infrastructure.Persistencia.Semillas;

public class OpcionesSemilla
{
    public const string Seccion = "Semilla";

    /// <summary>Carga personal, móviles y un historial de denuncias de ejemplo si la base está vacía.</summary>
    public bool DatosDemo { get; set; }

    /// <summary>Contraseña del administrador inicial (y de los usuarios de demostración).</summary>
    public string PasswordInicial { get; set; } = "Tucuman2026";

    public string? EmailAdministrador { get; set; }
}
