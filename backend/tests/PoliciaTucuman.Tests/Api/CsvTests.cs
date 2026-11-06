using System.Text;
using PoliciaTucuman.Api.Comun;

namespace PoliciaTucuman.Tests.Api;

public class CsvTests
{
    [Fact]
    public void EscapaSeparadoresYNeutralizaFormulas()
    {
        var bytes = Csv.Generar(["Número", "Detalle"], [["000001/2026", "=HYPERLINK(\"http://x\")"], ["2", "Calle 1; piso 2"]]);
        var texto = Encoding.UTF8.GetString(bytes).TrimStart('﻿');
        var lineas = texto.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal("Número;Detalle", lineas[0]);
        Assert.StartsWith("000001/2026;\"'=HYPERLINK", lineas[1]);
        Assert.Equal("2;\"Calle 1; piso 2\"", lineas[2]);
    }

    [Fact]
    public void IncluyeBomParaQueExcelRespeteLosAcentos()
    {
        var bytes = Csv.Generar(["Año"], []);
        Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes[..3]);
    }
}
