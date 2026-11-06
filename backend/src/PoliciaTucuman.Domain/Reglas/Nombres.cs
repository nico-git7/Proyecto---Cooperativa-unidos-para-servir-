using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Reglas;

/// <summary>Textos para mostrar de los enums. El front tiene sus propias etiquetas; estas se usan en correos, CSV y actuaciones.</summary>
public static class Nombres
{
    public static string Nombre(this TipoDelito tipo) => tipo switch
    {
        TipoDelito.Hurto => "Hurto",
        TipoDelito.Robo => "Robo",
        TipoDelito.RoboAutomotor => "Robo de automotor",
        TipoDelito.RoboMotocicleta => "Robo de motocicleta",
        TipoDelito.Danos => "Daños",
        TipoDelito.Amenazas => "Amenazas",
        TipoDelito.Lesiones => "Lesiones",
        TipoDelito.Estafa => "Estafa",
        TipoDelito.EstafaVirtual => "Estafa virtual",
        TipoDelito.ViolenciaFamiliar => "Violencia familiar",
        TipoDelito.ExtravioDocumentacion => "Extravío de documentación",
        _ => "Otro"
    };

    public static string Nombre(this EstadoDenuncia estado) => FlujoDenuncia.Nombre(estado);

    public static string Nombre(this Prioridad prioridad) => prioridad switch
    {
        Prioridad.Baja => "Baja",
        Prioridad.Media => "Media",
        Prioridad.Alta => "Alta",
        _ => "Urgente"
    };

    public static string Nombre(this Jerarquia jerarquia) => jerarquia switch
    {
        Jerarquia.Agente => "Agente",
        Jerarquia.Cabo => "Cabo",
        Jerarquia.CaboPrimero => "Cabo Primero",
        Jerarquia.Sargento => "Sargento",
        Jerarquia.SargentoPrimero => "Sargento Primero",
        Jerarquia.SargentoAyudante => "Sargento Ayudante",
        Jerarquia.SuboficialPrincipal => "Suboficial Principal",
        Jerarquia.SuboficialMayor => "Suboficial Mayor",
        Jerarquia.OficialAyudante => "Oficial Ayudante",
        Jerarquia.OficialSubinspector => "Oficial Subinspector",
        Jerarquia.OficialInspector => "Oficial Inspector",
        Jerarquia.OficialPrincipal => "Oficial Principal",
        Jerarquia.Subcomisario => "Subcomisario",
        Jerarquia.Comisario => "Comisario",
        Jerarquia.ComisarioInspector => "Comisario Inspector",
        Jerarquia.ComisarioMayor => "Comisario Mayor",
        Jerarquia.ComisarioGeneral => "Comisario General",
        _ => jerarquia.ToString()
    };

    public static string Nombre(this RolUsuario rol) => rol switch
    {
        RolUsuario.Administrador => "Administrador",
        RolUsuario.JefeDependencia => "Jefe de dependencia",
        _ => "Operador"
    };
}
