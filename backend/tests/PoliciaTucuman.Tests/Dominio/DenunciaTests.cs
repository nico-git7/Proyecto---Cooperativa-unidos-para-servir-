using PoliciaTucuman.Domain.Comun;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Tests.Dominio;

public class DenunciaTests
{
    [Fact]
    public void Registrar_DejaLaDenunciaRecibidaConPrioridadSegunElTipoYUnaActuacionPublica()
    {
        var denuncia = Fabrica.Denuncia(tipo: TipoDelito.ViolenciaFamiliar);

        Assert.Equal(EstadoDenuncia.Recibida, denuncia.Estado);
        Assert.Equal(Prioridad.Urgente, denuncia.Prioridad);
        Assert.Equal("000001/2026", denuncia.Numero);
        var registro = Assert.Single(denuncia.Actuaciones);
        Assert.True(registro.EsPublica);
        Assert.Contains("Comisaría Seccional 1ª", registro.DescripcionPublica);
    }

    [Fact]
    public void Registrar_RechazaFechasFuturas()
    {
        var ex = Assert.Throws<ReglaNegocioException>(() => Denuncia.Registrar(TipoDelito.Hurto, OrigenDenuncia.Web, Fabrica.Denunciante(),
            Fabrica.Ahora.AddDays(1), "Junín 100", "San Miguel de Tucumán", null, null, new string('x', 40), null, null, 1, "ABCD-2345", Fabrica.Ahora));
        Assert.Contains("posterior", ex.Message);
    }

    [Fact]
    public void Registrar_ExigeUnRelatoMinimo()
    {
        Assert.Throws<ReglaNegocioException>(() => Fabrica.Denuncia(relato: "Me robaron."));
    }

    [Fact]
    public void Registrar_RechazaUbicacionesFueraDeLaProvincia()
    {
        // Plaza de Mayo, Buenos Aires
        var ex = Assert.Throws<ReglaNegocioException>(() => Fabrica.Denuncia(lat: -34.6083, lng: -58.3712));
        Assert.Contains("Tucumán", ex.Message);
    }

    [Fact]
    public void AsignarOficial_PasaAAsignadaYRegistraLaFecha()
    {
        var denuncia = Fabrica.Denuncia();

        denuncia.AsignarOficial(Fabrica.Oficial(), usuarioId: 5, Fabrica.Ahora.AddHours(1));

        Assert.Equal(EstadoDenuncia.Asignada, denuncia.Estado);
        Assert.Equal(10, denuncia.OficialAsignadoId);
        Assert.Equal(Fabrica.Ahora.AddHours(1), denuncia.AsignadaEn);
    }

    [Fact]
    public void AsignarOficial_RechazaPersonalDeOtraDependencia()
    {
        var denuncia = Fabrica.Denuncia();
        Assert.Throws<ReglaNegocioException>(() => denuncia.AsignarOficial(Fabrica.Oficial(dependenciaId: 99), 5, Fabrica.Ahora));
    }

    [Fact]
    public void AsignarOficial_RechazaPersonalDeLicencia()
    {
        var denuncia = Fabrica.Denuncia();
        Assert.Throws<ReglaNegocioException>(() => denuncia.AsignarOficial(Fabrica.Oficial(situacion: SituacionRevista.Licencia), 5, Fabrica.Ahora));
    }

    [Fact]
    public void CambiarEstado_NoPermiteAvanzarSinInstructor()
    {
        var denuncia = Fabrica.Denuncia();
        Assert.Throws<ReglaNegocioException>(() => denuncia.CambiarEstado(EstadoDenuncia.EnInvestigacion, null, 5, Fabrica.Ahora));
    }

    [Fact]
    public void CambiarEstado_ExigeFundamentoParaCerrar()
    {
        var denuncia = Fabrica.Denuncia();
        denuncia.AsignarOficial(Fabrica.Oficial(), 5, Fabrica.Ahora);
        denuncia.CambiarEstado(EstadoDenuncia.EnInvestigacion, null, 5, Fabrica.Ahora);

        Assert.Throws<ReglaNegocioException>(() => denuncia.CambiarEstado(EstadoDenuncia.Archivada, " ", 5, Fabrica.Ahora));

        denuncia.CambiarEstado(EstadoDenuncia.Archivada, "Sin elementos para continuar.", 5, Fabrica.Ahora);
        Assert.True(denuncia.EstaCerrada);
        Assert.NotNull(denuncia.CerradaEn);
    }

    [Fact]
    public void CambiarEstado_PermiteReabrirUnaDenunciaArchivada()
    {
        var denuncia = Fabrica.Denuncia();
        denuncia.AsignarOficial(Fabrica.Oficial(), 5, Fabrica.Ahora);
        denuncia.CambiarEstado(EstadoDenuncia.EnInvestigacion, null, 5, Fabrica.Ahora);
        denuncia.CambiarEstado(EstadoDenuncia.Archivada, "Sin autores identificados.", 5, Fabrica.Ahora);

        denuncia.CambiarEstado(EstadoDenuncia.EnInvestigacion, "Aparecieron nuevos elementos.", 5, Fabrica.Ahora.AddDays(10));

        Assert.Equal(EstadoDenuncia.EnInvestigacion, denuncia.Estado);
        Assert.Null(denuncia.CerradaEn);
    }

    [Fact]
    public void CambiarEstado_RechazaTransicionesInvalidas()
    {
        var denuncia = Fabrica.Denuncia();
        var ex = Assert.Throws<ReglaNegocioException>(() => denuncia.CambiarEstado(EstadoDenuncia.Resuelta, "x", 5, Fabrica.Ahora));
        Assert.Contains("No se puede pasar", ex.Message);
    }

    [Fact]
    public void Derivar_CambiaLaJurisdiccionYQuitaElInstructor()
    {
        var denuncia = Fabrica.Denuncia();
        denuncia.AsignarOficial(Fabrica.Oficial(), 5, Fabrica.Ahora);
        var destino = Fabrica.Seccional(2, "Comisaría Seccional 2ª");

        denuncia.Derivar(destino, "El hecho ocurrió en otra jurisdicción.", 5, Fabrica.Ahora);

        Assert.Equal(2, denuncia.DependenciaId);
        Assert.Null(denuncia.OficialAsignadoId);
        Assert.Equal(EstadoDenuncia.Recibida, denuncia.Estado);
        Assert.Equal(TipoActuacion.Derivacion, denuncia.Actuaciones.Last().Tipo);
    }

    [Fact]
    public void AgregarNota_SoloEsPublicaSiSeInformaAlDenunciante()
    {
        var denuncia = Fabrica.Denuncia();

        var interna = denuncia.AgregarNota("Se pidieron cámaras.", false, 5, Fabrica.Ahora);
        var publica = denuncia.AgregarNota("Lo citamos para el lunes.", true, 5, Fabrica.Ahora);

        Assert.False(interna.EsPublica);
        Assert.True(publica.EsPublica);
    }

    [Fact]
    public void AgregarAdjunto_LimitaLaCantidadParaElDenunciante()
    {
        var denuncia = Fabrica.Denuncia();
        for (var i = 0; i < Denuncia.MaximoAdjuntos; i++)
            denuncia.AgregarAdjunto($"foto{i}.jpg", $"2026/11/{i}.jpg", "image/jpeg", 100, null, Fabrica.Ahora);

        Assert.Throws<ReglaNegocioException>(() => denuncia.AgregarAdjunto("otra.jpg", "x.jpg", "image/jpeg", 100, null, Fabrica.Ahora));
    }

    [Fact]
    public void Denunciante_NormalizaElDniYValidaSuFormato()
    {
        Assert.Equal("35123456", Fabrica.Denunciante().Dni);
        Assert.Throws<ReglaNegocioException>(() => new Denunciante("A", "B", "123", null, null, null, "X", "Y"));
    }
}
