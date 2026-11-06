namespace PoliciaTucuman.Domain.Enums;

public enum TipoDependencia
{
    Comisaria = 1,
    Subcomisaria,
    Destacamento,
    Division,
    Direccion
}

public enum TipoMovil
{
    Automovil = 1,
    Camioneta,
    Motocicleta,
    Utilitario
}

public enum EstadoMovil
{
    Operativo = 1,
    EnPatrullaje,
    EnTaller,
    FueraDeServicio
}

public enum EstadoCorreo
{
    Pendiente = 1,
    Enviado,
    Fallido
}
