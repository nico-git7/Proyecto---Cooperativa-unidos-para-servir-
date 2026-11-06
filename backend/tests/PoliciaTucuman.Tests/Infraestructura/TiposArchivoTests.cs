using PoliciaTucuman.Infrastructure.Almacenamiento;

namespace PoliciaTucuman.Tests.Infraestructura;

public class TiposArchivoTests
{
    [Fact]
    public void DetectaLosFormatosAdmitidosPorSuFirma()
    {
        Assert.Equal(TiposArchivo.Jpeg, TiposArchivo.Detectar([0xFF, 0xD8, 0xFF, 0xE0]));
        Assert.Equal(TiposArchivo.Png, TiposArchivo.Detectar([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0]));
        Assert.Equal(TiposArchivo.Pdf, TiposArchivo.Detectar("%PDF-1.7"u8.ToArray()));
        Assert.Equal(TiposArchivo.Webp, TiposArchivo.Detectar("RIFF\0\0\0\0WEBPVP8 "u8.ToArray()));
    }

    [Fact]
    public void RechazaArchivosConExtensionFalsa()
    {
        // Un ejecutable renombrado a .jpg no pasa la validación.
        Assert.Null(TiposArchivo.Detectar("MZ\x90\0\x03\0\0\0"u8.ToArray()));
        Assert.Null(TiposArchivo.Detectar("<html><script>"u8.ToArray()));
    }
}
