using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;

namespace PoliciaTucuman.Domain.Entidades;

public class Denuncia
{
    public const int LargoMinimoRelato = 30;
    public const int MaximoAdjuntos = 5;

    private readonly List<Actuacion> _actuaciones = [];
    private readonly List<Adjunto> _adjuntos = [];

    // EF Core
    private Denuncia() { }

    public int Id { get; private set; }
    public int Anio { get; private set; }

    /// <summary>Número correlativo tomado de una secuencia de la base antes de insertar.</summary>
    public long Correlativo { get; private set; }

    public string Numero => FormatearNumero(Correlativo, Anio);

    public string CodigoSeguimiento { get; private set; } = string.Empty;
    public TipoDelito Tipo { get; private set; }
    public EstadoDenuncia Estado { get; private set; }
    public Prioridad Prioridad { get; private set; }
    public OrigenDenuncia Origen { get; private set; }
    public Denunciante Denunciante { get; private set; } = null!;

    public DateTimeOffset FechaHecho { get; private set; }
    public string LugarHecho { get; private set; } = string.Empty;
    public string Localidad { get; private set; } = string.Empty;
    public double? Latitud { get; private set; }
    public double? Longitud { get; private set; }
    public string Relato { get; private set; } = string.Empty;
    public string? BienesInvolucrados { get; private set; }

    public int? DependenciaId { get; private set; }
    public Dependencia? Dependencia { get; private set; }
    public int? OficialAsignadoId { get; private set; }
    public Personal? OficialAsignado { get; private set; }

    public DateTimeOffset CreadaEn { get; private set; }
    public DateTimeOffset ActualizadaEn { get; private set; }
    public DateTimeOffset? AsignadaEn { get; private set; }
    public DateTimeOffset? CerradaEn { get; private set; }

    public IReadOnlyCollection<Actuacion> Actuaciones => _actuaciones;
    public IReadOnlyCollection<Adjunto> Adjuntos => _adjuntos;

    public bool EstaCerrada => FlujoDenuncia.EsCierre(Estado);

    public static string FormatearNumero(long correlativo, int anio) => $"{correlativo:D6}/{anio}";

    public static Denuncia Registrar(
        TipoDelito tipo,
        OrigenDenuncia origen,
        Denunciante denunciante,
        DateTimeOffset fechaHecho,
        string lugarHecho,
        string localidad,
        double? latitud,
        double? longitud,
        string relato,
        string? bienesInvolucrados,
        Dependencia? jurisdiccion,
        long correlativo,
        string codigoSeguimiento,
        DateTimeOffset ahora,
        int? registradaPorUsuarioId = null)
    {
        if (correlativo <= 0)
            throw new ArgumentOutOfRangeException(nameof(correlativo));

        if (fechaHecho > ahora.AddMinutes(5))
            throw new ReglaNegocioException("La fecha del hecho no puede ser posterior a la fecha actual.");

        if (fechaHecho < ahora.AddYears(-20))
            throw new ReglaNegocioException("La fecha del hecho no es válida.");

        if (string.IsNullOrWhiteSpace(relato) || relato.Trim().Length < LargoMinimoRelato)
            throw new ReglaNegocioException($"El relato del hecho debe tener al menos {LargoMinimoRelato} caracteres.");

        if (string.IsNullOrWhiteSpace(lugarHecho))
            throw new ReglaNegocioException("Indicá el lugar donde ocurrió el hecho.");

        if (latitud.HasValue != longitud.HasValue)
            throw new ReglaNegocioException("La ubicación del hecho está incompleta.");

        if (latitud.HasValue && !Geografia.EstaEnTucuman(latitud.Value, longitud!.Value))
            throw new ReglaNegocioException("La ubicación del hecho debe estar dentro de la provincia de Tucumán.");

        var denuncia = new Denuncia
        {
            Anio = HoraArgentina.Anio(ahora),
            Correlativo = correlativo,
            CodigoSeguimiento = codigoSeguimiento,
            Tipo = tipo,
            Estado = EstadoDenuncia.Recibida,
            Prioridad = PrioridadInicial.Para(tipo),
            Origen = origen,
            Denunciante = denunciante,
            FechaHecho = fechaHecho.ToUniversalTime(),
            LugarHecho = lugarHecho.Trim(),
            Localidad = localidad.Trim(),
            Latitud = latitud,
            Longitud = longitud,
            Relato = relato.Trim(),
            BienesInvolucrados = string.IsNullOrWhiteSpace(bienesInvolucrados) ? null : bienesInvolucrados.Trim(),
            DependenciaId = jurisdiccion?.Id,
            Dependencia = jurisdiccion,
            CreadaEn = ahora,
            ActualizadaEn = ahora,
        };

        var canal = origen == OrigenDenuncia.Web ? "Comisaría Virtual" : "mesa de entradas";
        var destino = jurisdiccion is null
            ? "Pendiente de asignación de jurisdicción."
            : $"Jurisdicción: {jurisdiccion.Nombre}.";

        denuncia.Registrar(TipoActuacion.Registro, ahora, registradaPorUsuarioId,
            $"Denuncia recibida por {canal}. {destino}",
            jurisdiccion is null
                ? "Su denuncia fue recibida."
                : $"Su denuncia fue recibida y remitida a {jurisdiccion.Nombre}.",
            null, EstadoDenuncia.Recibida);

        return denuncia;
    }

    public void AsignarOficial(Personal oficial, int usuarioId, DateTimeOffset ahora)
    {
        ValidarAbierta();

        if (DependenciaId is null)
            throw new ReglaNegocioException("La denuncia no tiene dependencia asignada.");

        if (oficial.DependenciaId != DependenciaId)
            throw new ReglaNegocioException("El instructor debe pertenecer a la dependencia que tiene la denuncia.");

        if (!oficial.PuedeInstruir)
            throw new ReglaNegocioException("El efectivo seleccionado no se encuentra en servicio efectivo.");

        if (OficialAsignadoId == oficial.Id)
            return;

        var anterior = Estado;
        OficialAsignadoId = oficial.Id;
        OficialAsignado = oficial;
        AsignadaEn ??= ahora;

        string? publica = null;
        if (Estado == EstadoDenuncia.Recibida)
        {
            Estado = EstadoDenuncia.Asignada;
            publica = FlujoDenuncia.MensajeParaDenunciante(EstadoDenuncia.Asignada);
        }

        Registrar(TipoActuacion.Asignacion, ahora, usuarioId,
            $"Instructor a cargo: {oficial.Jerarquia.Nombre()} {oficial.NombreCompleto} (Leg. {oficial.Legajo}).",
            publica, anterior, Estado);
    }

    public void Derivar(Dependencia destino, string motivo, int usuarioId, DateTimeOffset ahora)
    {
        ValidarAbierta();

        if (Estado is not (EstadoDenuncia.Recibida or EstadoDenuncia.Asignada))
            throw new ReglaNegocioException("Solo se pueden derivar denuncias que todavía no están en investigación.");

        if (destino.Id == DependenciaId)
            throw new ReglaNegocioException("La denuncia ya se encuentra en esa dependencia.");

        if (!destino.Activa)
            throw new ReglaNegocioException("La dependencia de destino no está activa.");

        if (string.IsNullOrWhiteSpace(motivo))
            throw new ReglaNegocioException("Indicá el motivo de la derivación.");

        var anterior = Estado;
        var origen = Dependencia?.Nombre ?? "sin jurisdicción";

        DependenciaId = destino.Id;
        Dependencia = destino;
        OficialAsignadoId = null;
        OficialAsignado = null;
        Estado = EstadoDenuncia.Recibida;

        Registrar(TipoActuacion.Derivacion, ahora, usuarioId,
            $"Derivada de {origen} a {destino.Nombre}. Motivo: {motivo.Trim()}",
            $"Su denuncia fue remitida a {destino.Nombre}.",
            anterior, Estado);
    }

    public void CambiarEstado(EstadoDenuncia nuevo, string? fundamento, int usuarioId, DateTimeOffset ahora)
    {
        if (nuevo == Estado)
            throw new ReglaNegocioException("La denuncia ya se encuentra en ese estado.");

        if (!FlujoDenuncia.PuedePasar(Estado, nuevo))
            throw new ReglaNegocioException(
                $"No se puede pasar de \"{FlujoDenuncia.Nombre(Estado)}\" a \"{FlujoDenuncia.Nombre(nuevo)}\".");

        if (nuevo == EstadoDenuncia.Asignada)
            throw new ReglaNegocioException("Para asignar la denuncia designá un instructor.");

        if (nuevo != EstadoDenuncia.Desestimada && OficialAsignadoId is null)
            throw new ReglaNegocioException("Antes de avanzar, la denuncia necesita un instructor a cargo.");

        if (FlujoDenuncia.RequiereFundamento(nuevo) && string.IsNullOrWhiteSpace(fundamento))
            throw new ReglaNegocioException($"Para marcarla como \"{FlujoDenuncia.Nombre(nuevo)}\" indicá el fundamento.");

        var anterior = Estado;
        Estado = nuevo;
        CerradaEn = FlujoDenuncia.EsCierre(nuevo) ? ahora : null;

        var detalle = $"Estado: {FlujoDenuncia.Nombre(anterior)} → {FlujoDenuncia.Nombre(nuevo)}.";
        if (!string.IsNullOrWhiteSpace(fundamento))
            detalle += $" {fundamento.Trim()}";

        Registrar(TipoActuacion.CambioEstado, ahora, usuarioId, detalle,
            FlujoDenuncia.MensajeParaDenunciante(nuevo), anterior, nuevo);
    }

    public void CambiarPrioridad(Prioridad prioridad, int usuarioId, DateTimeOffset ahora)
    {
        ValidarAbierta();
        if (prioridad == Prioridad)
            return;

        var anterior = Prioridad;
        Prioridad = prioridad;
        Registrar(TipoActuacion.Nota, ahora, usuarioId,
            $"Prioridad: {anterior.Nombre()} → {prioridad.Nombre()}.", null, null, null);
    }

    public Actuacion AgregarNota(string texto, bool informarAlDenunciante, int usuarioId, DateTimeOffset ahora)
    {
        if (string.IsNullOrWhiteSpace(texto))
            throw new ReglaNegocioException("La nota no puede estar vacía.");

        var limpio = texto.Trim();
        return Registrar(TipoActuacion.Nota, ahora, usuarioId, limpio,
            informarAlDenunciante ? limpio : null, null, null);
    }

    public Adjunto AgregarAdjunto(string nombreOriginal, string ruta, string contentType, long tamanoBytes,
        int? usuarioId, DateTimeOffset ahora)
    {
        if (_adjuntos.Count >= MaximoAdjuntos && usuarioId is null)
            throw new ReglaNegocioException($"Se admiten hasta {MaximoAdjuntos} archivos por denuncia.");

        var adjunto = new Adjunto
        {
            NombreOriginal = nombreOriginal,
            Ruta = ruta,
            ContentType = contentType,
            TamanoBytes = tamanoBytes,
            SubidoEn = ahora,
            SubidoPorUsuarioId = usuarioId,
        };
        _adjuntos.Add(adjunto);

        // Los adjuntos del denunciante quedan registrados en el alta; los del personal, como actuación.
        if (usuarioId is not null)
            Registrar(TipoActuacion.Adjunto, ahora, usuarioId, $"Se incorporó el archivo \"{nombreOriginal}\".", null, null, null);
        else
            ActualizadaEn = ahora;

        return adjunto;
    }

    private void ValidarAbierta()
    {
        if (EstaCerrada)
            throw new ReglaNegocioException("La denuncia está cerrada. Para operar sobre ella primero hay que reabrirla.");
    }

    private Actuacion Registrar(TipoActuacion tipo, DateTimeOffset fecha, int? usuarioId, string descripcion,
        string? descripcionPublica, EstadoDenuncia? anterior, EstadoDenuncia? nuevo)
    {
        var actuacion = new Actuacion
        {
            Tipo = tipo,
            Fecha = fecha,
            UsuarioId = usuarioId,
            Descripcion = descripcion,
            DescripcionPublica = descripcionPublica,
            EstadoAnterior = anterior,
            EstadoNuevo = nuevo,
        };
        _actuaciones.Add(actuacion);
        ActualizadaEn = fecha;
        return actuacion;
    }
}
