using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Api.Seguridad;

public static class Roles
{
    public const string Administrador = nameof(RolUsuario.Administrador);
    public const string JefeDependencia = nameof(RolUsuario.JefeDependencia);
    public const string Operador = nameof(RolUsuario.Operador);

    public const string Jefatura = Administrador + "," + JefeDependencia;
}

public static class Claims
{
    public const string Legajo = "legajo";
    public const string PersonalId = "personal_id";
    public const string DependenciaId = "dependencia_id";
}
