namespace PoliciaTucuman.Domain.Enums;

/// <summary>Escalafón general. Los valores dejan hueco entre suboficiales y oficiales para ordenar por grado.</summary>
public enum Jerarquia
{
    Agente = 1,
    Cabo,
    CaboPrimero,
    Sargento,
    SargentoPrimero,
    SargentoAyudante,
    SuboficialPrincipal,
    SuboficialMayor,

    OficialAyudante = 20,
    OficialSubinspector,
    OficialInspector,
    OficialPrincipal,
    Subcomisario,
    Comisario,
    ComisarioInspector,
    ComisarioMayor,
    ComisarioGeneral
}

public enum SituacionRevista
{
    ServicioEfectivo = 1,
    Licencia,
    Disponibilidad,
    Pasiva
}

public enum RolUsuario
{
    Administrador = 1,
    JefeDependencia,
    Operador
}
