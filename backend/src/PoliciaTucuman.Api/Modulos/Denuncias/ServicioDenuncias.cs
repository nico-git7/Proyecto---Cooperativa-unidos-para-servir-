using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PoliciaTucuman.Api.Comun;
using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Api.TiempoReal;
using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;
using PoliciaTucuman.Infrastructure.Almacenamiento;
using PoliciaTucuman.Infrastructure.Correo;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Api.Modulos.Denuncias;

public sealed partial class ServicioDenuncias(
    PoliciaDbContext db,
    IGeneradorCorrelativo correlativos,
    IAlmacenamientoArchivos almacenamiento,
    IColaCorreo correo,
    INotificadorNovedades notificador,
    Auditor auditor,
    UsuarioActual usuario,
    TimeProvider reloj,
    IOptions<OpcionesCorreo> opcionesCorreo)
{
    private static readonly TimeSpan OffsetArgentina = TimeSpan.FromHours(-3);
    private const int MaximoFilasExportacion = 10_000;
    private const int MaximoPuntosMapa = 5_000;

    private string UrlSitio => opcionesCorreo.Value.UrlSitio.TrimEnd('/');

    // ---------------------------------------------------------------- Alta

    public async Task<ComprobanteDenunciaDto> RegistrarAsync(NuevaDenunciaForm form, OrigenDenuncia origen, CancellationToken ct)
    {
        if (origen == OrigenDenuncia.Web)
        {
            if (!form.DeclaracionJurada)
                throw new ReglaNegocioException("Para enviar la denuncia tenés que aceptar la declaración jurada.");
            if (string.IsNullOrWhiteSpace(form.Denunciante.Email))
                throw new ReglaNegocioException("Ingresá un correo electrónico para recibir la constancia.");
        }

        var archivos = form.Adjuntos.Where(a => a.Length > 0).ToList();
        if (archivos.Count > Denuncia.MaximoAdjuntos)
            throw new ReglaNegocioException($"Se admiten hasta {Denuncia.MaximoAdjuntos} archivos por denuncia.");

        var ahora = reloj.GetUtcNow();
        var jurisdiccion = await ResolverJurisdiccionAsync(form, origen, ct);
        var usuarioId = origen == OrigenDenuncia.Presencial ? usuario.Id : (int?)null;

        var d = form.Denunciante;
        var denunciante = new Denunciante(d.Nombre, d.Apellido, d.Dni, d.FechaNacimiento, d.Telefono, d.Email, d.Domicilio, d.Localidad);

        var denuncia = Denuncia.Registrar(
            form.Tipo!.Value, origen, denunciante, form.FechaHecho!.Value, form.LugarHecho, form.Localidad,
            form.Latitud, form.Longitud, form.Relato, form.BienesInvolucrados, jurisdiccion,
            await correlativos.SiguienteAsync(ct), await GenerarCodigoUnicoAsync(ct), ahora, usuarioId);

        var guardados = new List<string>();
        try
        {
            foreach (var archivo in archivos)
            {
                await using var contenido = archivo.OpenReadStream();
                var guardado = await almacenamiento.GuardarAsync(contenido, ct);
                guardados.Add(guardado.Ruta);
                denuncia.AgregarAdjunto(NombreArchivoSeguro(archivo.FileName), guardado.Ruta, guardado.ContentType,
                    guardado.TamanoBytes, usuarioId, ahora);
            }

            db.Denuncias.Add(denuncia);
            var correoEnviado = EncolarAvisosDeAlta(denuncia);
            auditor.Registrar("Alta", "Denuncia", denuncia.Numero,
                $"{denuncia.Tipo.Nombre()} ({(origen == OrigenDenuncia.Web ? "Comisaría Virtual" : "presencial")})");

            await db.SaveChangesAsync(ct);
            await notificador.DenunciaRegistradaAsync(Aviso(denuncia), denuncia.DependenciaId);

            return new ComprobanteDenunciaDto(
                denuncia.Id, denuncia.Numero, denuncia.CodigoSeguimiento, denuncia.CreadaEn, denuncia.Tipo,
                denuncia.Denunciante.NombreCompleto, Contacto(jurisdiccion), correoEnviado, denuncia.Adjuntos.Count);
        }
        catch
        {
            foreach (var ruta in guardados)
                almacenamiento.Eliminar(ruta);
            throw;
        }
    }

    private async Task<Dependencia?> ResolverJurisdiccionAsync(NuevaDenunciaForm form, OrigenDenuncia origen, CancellationToken ct)
    {
        if (origen == OrigenDenuncia.Presencial)
        {
            var dependenciaId = form.DependenciaId ?? usuario.DependenciaId;
            usuario.ExigirAccesoA(dependenciaId);

            var dependencia = await db.Dependencias.FirstOrDefaultAsync(x => x.Id == dependenciaId && x.Activa, ct);
            if (dependencia is { RecibeDenuncias: true })
                return dependencia;

            if (form.DependenciaId.HasValue)
                throw new ReglaNegocioException("La dependencia seleccionada no recibe denuncias.");
        }

        var territoriales = await db.Dependencias.Where(x => x.Activa && x.RecibeDenuncias).ToListAsync(ct);
        return Geografia.ResolverJurisdiccion(territoriales, form.Latitud, form.Longitud, form.Localidad);
    }

    private async Task<string> GenerarCodigoUnicoAsync(CancellationToken ct)
    {
        for (var intento = 0; intento < 5; intento++)
        {
            var codigo = CodigoSeguimiento.Generar();
            if (!await db.Denuncias.AnyAsync(x => x.CodigoSeguimiento == codigo, ct))
                return codigo;
        }
        throw new InvalidOperationException("No se pudo generar un código de seguimiento único.");
    }

    private bool EncolarAvisosDeAlta(Denuncia denuncia)
    {
        var dependencia = denuncia.Dependencia;
        var enviado = false;

        if (denuncia.Denunciante.Email is { } email)
        {
            correo.Encolar(email, PlantillasCorreo.DenunciaRecibida, new
            {
                nombre = denuncia.Denunciante.Nombre,
                numero = denuncia.Numero,
                codigo = denuncia.CodigoSeguimiento,
                tipo = denuncia.Tipo.Nombre(),
                fecha = denuncia.CreadaEn,
                fechaHecho = denuncia.FechaHecho,
                lugar = $"{denuncia.LugarHecho}, {denuncia.Localidad}",
                dependencia = Contacto(dependencia),
                urlSeguimiento = UrlSeguimiento(denuncia),
            }, $"Denuncia {denuncia.Numero}");
            enviado = true;
        }

        if (dependencia?.Email is { } emailDependencia)
        {
            correo.Encolar(emailDependencia, PlantillasCorreo.AvisoDependencia, new
            {
                dependencia = dependencia.Nombre,
                numero = denuncia.Numero,
                tipo = denuncia.Tipo.Nombre(),
                prioridad = denuncia.Prioridad.Nombre(),
                lugar = $"{denuncia.LugarHecho}, {denuncia.Localidad}",
                fechaHecho = denuncia.FechaHecho,
                url = $"{UrlSitio}/intranet/denuncias/{denuncia.Id}",
            }, $"Denuncia {denuncia.Numero}");
        }

        return enviado;
    }

    // ---------------------------------------------------------------- Consultas

    public IQueryable<Denuncia> Consultar(FiltroDenuncias f)
    {
        var q = db.Denuncias.AsNoTracking();

        if (usuario.AlcanceDependencia is { } alcance)
            q = q.Where(x => x.DependenciaId == alcance);
        else if (f.DependenciaId.HasValue)
            q = q.Where(x => x.DependenciaId == f.DependenciaId);

        if (f.UnidadRegionalId.HasValue)
            q = q.Where(x => x.Dependencia!.UnidadRegionalId == f.UnidadRegionalId);
        if (f.Estado.HasValue)
            q = q.Where(x => x.Estado == f.Estado);
        if (f.Tipo.HasValue)
            q = q.Where(x => x.Tipo == f.Tipo);
        if (f.Prioridad.HasValue)
            q = q.Where(x => x.Prioridad == f.Prioridad);
        if (f.Origen.HasValue)
            q = q.Where(x => x.Origen == f.Origen);
        if (f.SoloAbiertas)
            q = q.Where(x => x.Estado != EstadoDenuncia.Resuelta && x.Estado != EstadoDenuncia.Archivada && x.Estado != EstadoDenuncia.Desestimada);
        if (f.SinInstructor)
            q = q.Where(x => x.OficialAsignadoId == null);
        if (f.Mias)
            q = q.Where(x => x.OficialAsignadoId == usuario.PersonalId);

        if (f.Desde is { } desde)
        {
            var inicio = InicioDelDia(desde);
            q = q.Where(x => x.CreadaEn >= inicio);
        }
        if (f.Hasta is { } hasta)
        {
            var fin = InicioDelDia(hasta.AddDays(1));
            q = q.Where(x => x.CreadaEn < fin);
        }

        if (!string.IsNullOrWhiteSpace(f.Texto))
            q = FiltrarPorTexto(q, f.Texto.Trim());

        return q;
    }

    private static IQueryable<Denuncia> FiltrarPorTexto(IQueryable<Denuncia> q, string texto)
    {
        var numero = PatronNumero().Match(texto);
        if (numero.Success)
        {
            var correlativo = long.Parse(numero.Groups["n"].Value);
            if (numero.Groups["a"].Success)
            {
                var anio = int.Parse(numero.Groups["a"].Value);
                return q.Where(x => x.Correlativo == correlativo && x.Anio == anio);
            }
            return q.Where(x => x.Correlativo == correlativo);
        }

        var digitos = Documento.Normalizar(texto);
        if (digitos.Length >= 7 && digitos.Length == texto.Count(char.IsLetterOrDigit))
            return q.Where(x => x.Denunciante.Dni == digitos);

        var codigo = CodigoSeguimiento.Normalizar(texto);
        var patron = $"%{texto.Replace("%", "").Replace("_", "")}%";
        return q.Where(x =>
            x.CodigoSeguimiento == codigo ||
            EF.Functions.ILike(EF.Functions.Unaccent(x.Denunciante.Apellido), EF.Functions.Unaccent(patron)) ||
            EF.Functions.ILike(EF.Functions.Unaccent(x.Denunciante.Nombre), EF.Functions.Unaccent(patron)) ||
            EF.Functions.ILike(EF.Functions.Unaccent(x.LugarHecho), EF.Functions.Unaccent(patron)) ||
            EF.Functions.ILike(EF.Functions.Unaccent(x.Relato), EF.Functions.Unaccent(patron)));
    }

    [GeneratedRegex(@"^0*(?<n>\d{1,6})(\s*/\s*(?<a>\d{4}))?$")]
    private static partial Regex PatronNumero();

    public async Task<Pagina<DenunciaItemDto>> ListarAsync(FiltroDenuncias filtro, CancellationToken ct)
    {
        var q = Consultar(filtro);
        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(x => x.CreadaEn)
            .Skip(filtro.Saltear)
            .Take(filtro.Tamano)
            .Select(x => new DenunciaItemDto(
                x.Id,
                Denuncia.FormatearNumero(x.Correlativo, x.Anio),
                x.Tipo, x.Estado, x.Prioridad, x.Origen,
                x.Denunciante.Apellido + ", " + x.Denunciante.Nombre,
                x.Denunciante.Dni,
                x.LugarHecho, x.Localidad, x.FechaHecho, x.CreadaEn,
                x.Dependencia != null ? x.Dependencia.Nombre : null,
                x.OficialAsignado != null ? x.OficialAsignado.Apellido + ", " + x.OficialAsignado.Nombre : null))
            .ToListAsync(ct);

        return new Pagina<DenunciaItemDto>(items, total, filtro.Pagina, filtro.Tamano);
    }

    public async Task<IReadOnlyList<PuntoMapaDto>> PuntosMapaAsync(FiltroDenuncias filtro, CancellationToken ct) =>
        await Consultar(filtro)
            .Where(x => x.Latitud != null && x.Longitud != null)
            .OrderByDescending(x => x.CreadaEn)
            .Take(MaximoPuntosMapa)
            .Select(x => new PuntoMapaDto(x.Id, Denuncia.FormatearNumero(x.Correlativo, x.Anio), x.Tipo, x.Estado, x.Prioridad,
                x.Latitud!.Value, x.Longitud!.Value, x.FechaHecho))
            .ToListAsync(ct);

    public async Task<byte[]> ExportarAsync(FiltroDenuncias filtro, CancellationToken ct)
    {
        var filas = await Consultar(filtro)
            .OrderByDescending(x => x.CreadaEn)
            .Take(MaximoFilasExportacion)
            .Select(x => new
            {
                x.Correlativo, x.Anio, x.CreadaEn, x.FechaHecho, x.Tipo, x.Estado, x.Prioridad, x.Origen,
                Dependencia = x.Dependencia != null ? x.Dependencia.Nombre : "",
                Instructor = x.OficialAsignado != null ? x.OficialAsignado.Apellido + ", " + x.OficialAsignado.Nombre : "",
                Denunciante = x.Denunciante.Apellido + ", " + x.Denunciante.Nombre,
                x.Denunciante.Dni, x.LugarHecho, x.Localidad,
            })
            .ToListAsync(ct);

        auditor.Registrar("Exportación", "Denuncia", null, $"{filas.Count} registros");
        await db.SaveChangesAsync(ct);

        return Csv.Generar(
            ["Número", "Fecha denuncia", "Fecha hecho", "Tipo", "Estado", "Prioridad", "Origen", "Dependencia", "Instructor", "Denunciante", "DNI", "Lugar", "Localidad"],
            filas.Select(x => new object?[]
            {
                Denuncia.FormatearNumero(x.Correlativo, x.Anio),
                HoraArgentina.Convertir(x.CreadaEn).ToString("dd/MM/yyyy HH:mm"),
                HoraArgentina.Convertir(x.FechaHecho).ToString("dd/MM/yyyy HH:mm"),
                x.Tipo.Nombre(), x.Estado.Nombre(), x.Prioridad.Nombre(),
                x.Origen == OrigenDenuncia.Web ? "Comisaría Virtual" : "Presencial",
                x.Dependencia, x.Instructor, x.Denunciante, x.Dni, x.LugarHecho, x.Localidad,
            }));
    }

    public async Task<DenunciaDetalleDto> ObtenerAsync(int id, CancellationToken ct)
    {
        var denuncia = await db.Denuncias
            .AsNoTracking()
            .AsSplitQuery()
            .Include(x => x.Dependencia)
            .Include(x => x.OficialAsignado)
            .Include(x => x.Adjuntos)
            .Include(x => x.Actuaciones).ThenInclude(a => a.Usuario).ThenInclude(u => u!.Personal)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NoEncontradoException("La denuncia no existe.");

        usuario.ExigirAccesoA(denuncia.DependenciaId);

        var den = denuncia.Denunciante;
        var cerrada = denuncia.EstaCerrada;
        var permisos = new PermisosDenunciaDto(
            Operar: true,
            Asignar: usuario.EsJefatura && !cerrada,
            Derivar: usuario.EsJefatura && denuncia.Estado is EstadoDenuncia.Recibida or EstadoDenuncia.Asignada);

        return new DenunciaDetalleDto(
            denuncia.Id, denuncia.Numero, denuncia.CodigoSeguimiento, denuncia.Tipo, denuncia.Estado, denuncia.Prioridad, denuncia.Origen,
            new DenuncianteDetalleDto(den.Nombre, den.Apellido, den.Dni, den.FechaNacimiento, den.Telefono, den.Email, den.Domicilio, den.Localidad),
            denuncia.FechaHecho, denuncia.LugarHecho, denuncia.Localidad, denuncia.Latitud, denuncia.Longitud,
            denuncia.Relato, denuncia.BienesInvolucrados,
            Contacto(denuncia.Dependencia),
            denuncia.OficialAsignado is { } o ? new PersonaRefDto(o.Id, o.Legajo, o.NombreCompleto, o.Jerarquia) : null,
            denuncia.CreadaEn, denuncia.ActualizadaEn, denuncia.CerradaEn,
            denuncia.Actuaciones
                .OrderByDescending(a => a.Fecha).ThenByDescending(a => a.Id)
                .Select(a => new ActuacionDto(a.Id, a.Tipo, a.Fecha, a.Descripcion, a.EsPublica, a.EstadoAnterior, a.EstadoNuevo,
                    a.Usuario?.Personal is { } p ? $"{p.Jerarquia.Nombre()} {p.Apellido}" : null))
                .ToList(),
            denuncia.Adjuntos
                .OrderBy(a => a.SubidoEn)
                .Select(a => new AdjuntoDto(a.Id, a.NombreOriginal, a.ContentType, a.TamanoBytes, a.SubidoEn, a.SubidoPorUsuarioId is null))
                .ToList(),
            FlujoDenuncia.Siguientes(denuncia.Estado).Where(e => e != EstadoDenuncia.Asignada).ToList(),
            permisos);
    }

    // ---------------------------------------------------------------- Operaciones

    public async Task CambiarEstadoAsync(int id, CambioEstadoRequest request, CancellationToken ct)
    {
        var denuncia = await CargarParaOperarAsync(id, ct);
        var anterior = denuncia.Estado;
        var nuevo = request.Estado!.Value;

        denuncia.CambiarEstado(nuevo, request.Fundamento, usuario.Id, reloj.GetUtcNow());
        auditor.Registrar("Cambio de estado", "Denuncia", denuncia.Numero, $"{anterior.Nombre()} → {nuevo.Nombre()}");
        EncolarActualizacion(denuncia, FlujoDenuncia.MensajeParaDenunciante(nuevo));

        await GuardarYNotificarAsync(denuncia, ct);
    }

    public async Task AsignarAsync(int id, AsignacionRequest request, CancellationToken ct)
    {
        var denuncia = await CargarParaOperarAsync(id, ct);
        var oficial = await db.Personal.FirstOrDefaultAsync(p => p.Id == request.PersonalId, ct)
                      ?? throw new NoEncontradoException("El efectivo seleccionado no existe.");

        var anterior = denuncia.Estado;
        denuncia.AsignarOficial(oficial, usuario.Id, reloj.GetUtcNow());
        auditor.Registrar("Asignación", "Denuncia", denuncia.Numero, $"Instructor: Leg. {oficial.Legajo} {oficial.NombreCompleto}");

        if (anterior != denuncia.Estado)
            EncolarActualizacion(denuncia, FlujoDenuncia.MensajeParaDenunciante(denuncia.Estado));

        await GuardarYNotificarAsync(denuncia, ct);
    }

    public async Task DerivarAsync(int id, DerivacionRequest request, CancellationToken ct)
    {
        var denuncia = await CargarParaOperarAsync(id, ct);
        var origenId = denuncia.DependenciaId;
        var destino = await db.Dependencias.FirstOrDefaultAsync(x => x.Id == request.DependenciaId, ct)
                      ?? throw new NoEncontradoException("La dependencia de destino no existe.");

        denuncia.Derivar(destino, request.Motivo, usuario.Id, reloj.GetUtcNow());
        auditor.Registrar("Derivación", "Denuncia", denuncia.Numero, $"A {destino.Nombre}. {request.Motivo}");
        EncolarActualizacion(denuncia, $"Su denuncia fue remitida a {destino.Nombre}.");

        await GuardarYNotificarAsync(denuncia, ct);
        if (origenId.HasValue)
            await notificador.DenunciaActualizadaAsync(Aviso(denuncia), origenId);
    }

    public async Task CambiarPrioridadAsync(int id, PrioridadRequest request, CancellationToken ct)
    {
        var denuncia = await CargarParaOperarAsync(id, ct);
        denuncia.CambiarPrioridad(request.Prioridad!.Value, usuario.Id, reloj.GetUtcNow());
        auditor.Registrar("Cambio de prioridad", "Denuncia", denuncia.Numero, request.Prioridad.Value.Nombre());
        await GuardarYNotificarAsync(denuncia, ct);
    }

    public async Task AgregarNotaAsync(int id, NotaRequest request, CancellationToken ct)
    {
        var denuncia = await CargarParaOperarAsync(id, ct);
        denuncia.AgregarNota(request.Texto, request.InformarAlDenunciante, usuario.Id, reloj.GetUtcNow());
        auditor.Registrar("Nota", "Denuncia", denuncia.Numero, request.InformarAlDenunciante ? "Informada al denunciante" : "Interna");

        if (request.InformarAlDenunciante)
            EncolarActualizacion(denuncia, request.Texto.Trim());

        await GuardarYNotificarAsync(denuncia, ct);
    }

    public async Task AgregarAdjuntoAsync(int id, IFormFile archivo, CancellationToken ct)
    {
        if (archivo is null || archivo.Length == 0)
            throw new ReglaNegocioException("Seleccioná un archivo.");

        var denuncia = await CargarParaOperarAsync(id, ct);
        await using var contenido = archivo.OpenReadStream();
        var guardado = await almacenamiento.GuardarAsync(contenido, ct);
        try
        {
            denuncia.AgregarAdjunto(NombreArchivoSeguro(archivo.FileName), guardado.Ruta, guardado.ContentType,
                guardado.TamanoBytes, usuario.Id, reloj.GetUtcNow());
            auditor.Registrar("Adjunto", "Denuncia", denuncia.Numero, archivo.FileName);
            await GuardarYNotificarAsync(denuncia, ct);
        }
        catch
        {
            almacenamiento.Eliminar(guardado.Ruta);
            throw;
        }
    }

    public async Task<(Stream Contenido, string ContentType, string Nombre)> AbrirAdjuntoAsync(int id, int adjuntoId, CancellationToken ct)
    {
        var datos = await db.Adjuntos
            .AsNoTracking()
            .Where(a => a.Id == adjuntoId && a.DenunciaId == id)
            .Select(a => new { a.Ruta, a.ContentType, a.NombreOriginal, DependenciaId = db.Denuncias.Where(x => x.Id == id).Select(x => x.DependenciaId).First() })
            .FirstOrDefaultAsync(ct)
            ?? throw new NoEncontradoException("El archivo no existe.");

        usuario.ExigirAccesoA(datos.DependenciaId);

        var contenido = almacenamiento.Abrir(datos.Ruta)
                        ?? throw new NoEncontradoException("El archivo no se encuentra disponible.");
        return (contenido, datos.ContentType, datos.NombreOriginal);
    }

    // ---------------------------------------------------------------- Seguimiento público

    public async Task<SeguimientoDto> SeguimientoAsync(SeguimientoRequest request, CancellationToken ct)
    {
        var codigo = CodigoSeguimiento.Normalizar(request.Codigo);
        var dni = Documento.Normalizar(request.Dni);

        var denuncia = await db.Denuncias
            .AsNoTracking()
            .Include(x => x.Dependencia)
            .Include(x => x.Actuaciones)
            .FirstOrDefaultAsync(x => x.CodigoSeguimiento == codigo, ct);

        // Mismo mensaje si no existe o si el DNI no coincide: no se revela qué dato falló.
        if (denuncia is null || denuncia.Denunciante.Dni != dni)
            throw new NoEncontradoException("No encontramos una denuncia con esos datos. Revisá el código de seguimiento y el DNI.");

        return new SeguimientoDto(
            denuncia.Numero, denuncia.Tipo, denuncia.Estado, denuncia.CreadaEn, denuncia.FechaHecho,
            denuncia.Denunciante.NombreCompleto, Contacto(denuncia.Dependencia),
            denuncia.Actuaciones
                .Where(a => a.EsPublica)
                .OrderByDescending(a => a.Fecha).ThenByDescending(a => a.Id)
                .Select(a => new MovimientoPublicoDto(a.Fecha, a.DescripcionPublica!, a.EstadoNuevo))
                .ToList());
    }

    // ---------------------------------------------------------------- Auxiliares

    private async Task<Denuncia> CargarParaOperarAsync(int id, CancellationToken ct)
    {
        var denuncia = await db.Denuncias
            .Include(x => x.Dependencia)
            .Include(x => x.OficialAsignado)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NoEncontradoException("La denuncia no existe.");

        usuario.ExigirAccesoA(denuncia.DependenciaId);
        return denuncia;
    }

    private async Task GuardarYNotificarAsync(Denuncia denuncia, CancellationToken ct)
    {
        await db.SaveChangesAsync(ct);
        await notificador.DenunciaActualizadaAsync(Aviso(denuncia), denuncia.DependenciaId);
    }

    private void EncolarActualizacion(Denuncia denuncia, string mensaje)
    {
        if (denuncia.Denunciante.Email is not { } email)
            return;

        correo.Encolar(email, PlantillasCorreo.DenunciaActualizada, new
        {
            nombre = denuncia.Denunciante.Nombre,
            numero = denuncia.Numero,
            estado = denuncia.Estado.Nombre(),
            mensaje,
            fecha = reloj.GetUtcNow(),
            dependencia = Contacto(denuncia.Dependencia),
            urlSeguimiento = UrlSeguimiento(denuncia),
        }, $"Denuncia {denuncia.Numero}");
    }

    private string UrlSeguimiento(Denuncia denuncia) => $"{UrlSitio}/seguimiento?codigo={denuncia.CodigoSeguimiento}";

    private static AvisoDenuncia Aviso(Denuncia d) =>
        new(d.Id, d.Numero, d.Tipo.ToString(), d.Prioridad.ToString(), d.Estado.ToString(), d.Dependencia?.Nombre, d.Origen.ToString());

    private static DependenciaContactoDto? Contacto(Dependencia? d) =>
        d is null ? null : new DependenciaContactoDto(d.Id, d.Nombre, d.Direccion, d.Localidad, d.Telefono);

    private static DateTimeOffset InicioDelDia(DateOnly fecha) =>
        new DateTimeOffset(fecha.ToDateTime(TimeOnly.MinValue), OffsetArgentina).ToUniversalTime();

    private static string NombreArchivoSeguro(string? nombre)
    {
        var limpio = new string(Path.GetFileName(nombre ?? string.Empty).Where(c => !char.IsControl(c) && c is not ('"' or '\\' or '/')).ToArray()).Trim();
        if (limpio.Length == 0)
            return "archivo";
        return limpio.Length > 120 ? limpio[^120..] : limpio;
    }
}
