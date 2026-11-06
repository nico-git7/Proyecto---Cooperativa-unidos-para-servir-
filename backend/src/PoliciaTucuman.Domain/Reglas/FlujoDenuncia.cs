using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Domain.Reglas;

public static class FlujoDenuncia
{
    private static readonly Dictionary<EstadoDenuncia, EstadoDenuncia[]> Transiciones = new()
    {
        [EstadoDenuncia.Recibida] = [EstadoDenuncia.Asignada, EstadoDenuncia.Desestimada],
        [EstadoDenuncia.Asignada] = [EstadoDenuncia.EnInvestigacion, EstadoDenuncia.ElevadaFiscalia, EstadoDenuncia.Resuelta, EstadoDenuncia.Archivada, EstadoDenuncia.Desestimada],
        [EstadoDenuncia.EnInvestigacion] = [EstadoDenuncia.ElevadaFiscalia, EstadoDenuncia.Resuelta, EstadoDenuncia.Archivada],
        [EstadoDenuncia.ElevadaFiscalia] = [EstadoDenuncia.Resuelta, EstadoDenuncia.Archivada],
        [EstadoDenuncia.Archivada] = [EstadoDenuncia.EnInvestigacion],
        [EstadoDenuncia.Resuelta] = [],
        [EstadoDenuncia.Desestimada] = [],
    };

    public static IReadOnlyList<EstadoDenuncia> Siguientes(EstadoDenuncia actual) => Transiciones[actual];

    public static bool PuedePasar(EstadoDenuncia desde, EstadoDenuncia hacia) => Transiciones[desde].Contains(hacia);

    public static bool EsCierre(EstadoDenuncia estado) =>
        estado is EstadoDenuncia.Resuelta or EstadoDenuncia.Archivada or EstadoDenuncia.Desestimada;

    public static bool RequiereFundamento(EstadoDenuncia estado) =>
        estado is EstadoDenuncia.Archivada or EstadoDenuncia.Desestimada or EstadoDenuncia.Resuelta;

    public static string Nombre(EstadoDenuncia estado) => estado switch
    {
        EstadoDenuncia.Recibida => "Recibida",
        EstadoDenuncia.Asignada => "Asignada",
        EstadoDenuncia.EnInvestigacion => "En investigación",
        EstadoDenuncia.ElevadaFiscalia => "Elevada a Fiscalía",
        EstadoDenuncia.Resuelta => "Resuelta",
        EstadoDenuncia.Archivada => "Archivada",
        EstadoDenuncia.Desestimada => "Desestimada",
        _ => estado.ToString()
    };

    public static string MensajeParaDenunciante(EstadoDenuncia estado) => estado switch
    {
        EstadoDenuncia.Asignada => "Su denuncia fue asignada a un instructor de la dependencia.",
        EstadoDenuncia.EnInvestigacion => "Su denuncia se encuentra en etapa de investigación.",
        EstadoDenuncia.ElevadaFiscalia => "Las actuaciones fueron elevadas a la Fiscalía interviniente.",
        EstadoDenuncia.Resuelta => "Las actuaciones fueron concluidas.",
        EstadoDenuncia.Archivada => "Las actuaciones fueron archivadas.",
        EstadoDenuncia.Desestimada => "La denuncia fue desestimada.",
        _ => "Su denuncia fue recibida."
    };
}
