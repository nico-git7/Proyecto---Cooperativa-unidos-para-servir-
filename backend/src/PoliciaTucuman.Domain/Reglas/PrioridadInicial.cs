using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Reglas;

public static class PrioridadInicial
{
    public static Prioridad Para(TipoDelito tipo) => tipo switch
    {
        TipoDelito.ViolenciaFamiliar => Prioridad.Urgente,
        TipoDelito.Robo or TipoDelito.RoboAutomotor or TipoDelito.Lesiones => Prioridad.Alta,
        TipoDelito.RoboMotocicleta or TipoDelito.Amenazas or TipoDelito.Estafa
            or TipoDelito.EstafaVirtual or TipoDelito.Hurto => Prioridad.Media,
        _ => Prioridad.Baja
    };
}
