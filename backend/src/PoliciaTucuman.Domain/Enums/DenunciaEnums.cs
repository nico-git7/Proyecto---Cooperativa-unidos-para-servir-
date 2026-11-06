namespace PoliciaTucuman.Domain.Enums;

public enum TipoDelito
{
    Hurto = 1,
    Robo,
    RoboAutomotor,
    RoboMotocicleta,
    Danos,
    Amenazas,
    Lesiones,
    Estafa,
    EstafaVirtual,
    ViolenciaFamiliar,
    ExtravioDocumentacion,
    Otro
}

public enum EstadoDenuncia
{
    Recibida = 1,
    Asignada,
    EnInvestigacion,
    ElevadaFiscalia,
    Resuelta,
    Archivada,
    Desestimada
}

public enum Prioridad
{
    Baja = 1,
    Media,
    Alta,
    Urgente
}

public enum OrigenDenuncia
{
    Web = 1,
    Presencial
}

public enum TipoActuacion
{
    Registro = 1,
    CambioEstado,
    Asignacion,
    Derivacion,
    Nota,
    Adjunto
}
