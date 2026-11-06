using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Reglas;

namespace PoliciaTucuman.Domain.Entidades;

public class Denunciante
{
    // EF Core
    private Denunciante() { }

    public Denunciante(string nombre, string apellido, string dni, DateOnly? fechaNacimiento,
        string? telefono, string? email, string domicilio, string localidad)
    {
        var dniNormalizado = Documento.Normalizar(dni);
        if (!Documento.EsValido(dniNormalizado))
            throw new ReglaNegocioException("El DNI del denunciante no es válido.");

        if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(apellido))
            throw new ReglaNegocioException("Nombre y apellido del denunciante son obligatorios.");

        Nombre = nombre.Trim();
        Apellido = apellido.Trim();
        Dni = dniNormalizado;
        FechaNacimiento = fechaNacimiento;
        Telefono = string.IsNullOrWhiteSpace(telefono) ? null : telefono.Trim();
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
        Domicilio = domicilio.Trim();
        Localidad = localidad.Trim();
    }

    public string Nombre { get; private set; } = string.Empty;
    public string Apellido { get; private set; } = string.Empty;
    public string Dni { get; private set; } = string.Empty;
    public DateOnly? FechaNacimiento { get; private set; }
    public string? Telefono { get; private set; }
    public string? Email { get; private set; }
    public string Domicilio { get; private set; } = string.Empty;
    public string Localidad { get; private set; } = string.Empty;

    public string NombreCompleto => $"{Apellido}, {Nombre}";
}
