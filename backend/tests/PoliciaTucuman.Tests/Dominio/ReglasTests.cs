using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;
using PoliciaTucuman.Domain.Reglas;

namespace PoliciaTucuman.Tests.Dominio;

public class ReglasTests
{
    [Theory]
    [InlineData(EstadoDenuncia.Recibida, EstadoDenuncia.Asignada, true)]
    [InlineData(EstadoDenuncia.Recibida, EstadoDenuncia.Resuelta, false)]
    [InlineData(EstadoDenuncia.EnInvestigacion, EstadoDenuncia.ElevadaFiscalia, true)]
    [InlineData(EstadoDenuncia.Resuelta, EstadoDenuncia.EnInvestigacion, false)]
    [InlineData(EstadoDenuncia.Archivada, EstadoDenuncia.EnInvestigacion, true)]
    public void FlujoDenuncia_DefineLasTransicionesPermitidas(EstadoDenuncia desde, EstadoDenuncia hacia, bool permitida) =>
        Assert.Equal(permitida, FlujoDenuncia.PuedePasar(desde, hacia));

    [Fact]
    public void Jurisdiccion_EsLaDependenciaTerritorialMasCercana()
    {
        var primera = Fabrica.Seccional(1, "Seccional 1ª", -26.8268, -65.2085);
        var yerbaBuena = Fabrica.Seccional(2, "Comisaría de Yerba Buena", -26.8162, -65.3155, "Yerba Buena");
        var jefatura = new Dependencia { Id = 3, Nombre = "Jefatura", Latitud = -26.8160, Longitud = -65.3150, RecibeDenuncias = false };

        // Av. Aconquija al 1500: más cerca de Yerba Buena; la Jefatura no cuenta aunque esté al lado.
        var resultado = Geografia.ResolverJurisdiccion([primera, yerbaBuena, jefatura], -26.8155, -65.3100, null);

        Assert.Equal(2, resultado?.Id);
    }

    [Fact]
    public void Jurisdiccion_SinCoordenadasUsaLaLocalidadIgnorandoAcentos()
    {
        var concepcion = Fabrica.Seccional(5, "Comisaría de Concepción", -27.34, -65.59, "Concepción");
        var resultado = Geografia.ResolverJurisdiccion([Fabrica.Seccional(), concepcion], null, null, "concepcion");
        Assert.Equal(5, resultado?.Id);
    }

    [Fact]
    public void Distancia_EntreDosPuntosConocidos()
    {
        // Plaza Independencia - Parque 9 de Julio: aprox. 1,5 km
        var km = Geografia.DistanciaKm(-26.8303, -65.2038, -26.8306, -65.1880);
        Assert.InRange(km, 1.4, 1.7);
    }

    [Fact]
    public void CodigoSeguimiento_TieneFormatoLegibleYSeNormaliza()
    {
        var codigo = CodigoSeguimiento.Generar();

        Assert.Matches("^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$", codigo);
        Assert.Equal(codigo, CodigoSeguimiento.Normalizar(codigo.ToLowerInvariant().Replace("-", " ")));
    }

    [Theory]
    [InlineData("35.123.456", true)]
    [InlineData("8123456", true)]
    [InlineData("012345678", false)]
    [InlineData("123", false)]
    public void Documento_ValidaDni(string dni, bool valido) =>
        Assert.Equal(valido, Documento.EsValido(Documento.Normalizar(dni)));

    [Fact]
    public void Usuario_SeBloqueaTrasCincoIntentosFallidos()
    {
        var usuario = new Usuario();
        for (var i = 0; i < Usuario.MaximoIntentosFallidos; i++)
            usuario.RegistrarAccesoFallido(Fabrica.Ahora);

        Assert.True(usuario.EstaBloqueado(Fabrica.Ahora.AddMinutes(1)));
        Assert.False(usuario.EstaBloqueado(Fabrica.Ahora.Add(Usuario.DuracionBloqueo).AddSeconds(1)));
    }

    [Fact]
    public void CorreoSaliente_ReintentaConEsperaCrecienteYFallaAlAgotarIntentos()
    {
        var correo = new CorreoSaliente { ProximoIntento = Fabrica.Ahora };

        correo.RegistrarFallo("timeout", Fabrica.Ahora);
        Assert.Equal(Fabrica.Ahora.AddSeconds(30), correo.ProximoIntento);
        correo.RegistrarFallo("timeout", Fabrica.Ahora);
        Assert.Equal(Fabrica.Ahora.AddSeconds(60), correo.ProximoIntento);

        while (correo.Estado == EstadoCorreo.Pendiente)
            correo.RegistrarFallo("timeout", Fabrica.Ahora);

        Assert.Equal(EstadoCorreo.Fallido, correo.Estado);
        Assert.Equal(CorreoSaliente.MaximoIntentos, correo.Intentos);
    }
}
