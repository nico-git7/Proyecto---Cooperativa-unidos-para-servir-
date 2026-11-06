using System.Text;

namespace PoliciaTucuman.Api.Comun;

public static class Csv
{
    /// <summary>CSV separado por punto y coma con BOM, que es lo que Excel en castellano abre sin asistente.</summary>
    public static byte[] Generar(IEnumerable<string> encabezados, IEnumerable<IEnumerable<object?>> filas)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(';', encabezados.Select(Escapar)));
        foreach (var fila in filas)
            sb.AppendLine(string.Join(';', fila.Select(v => Escapar(v?.ToString() ?? string.Empty))));

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    private static string Escapar(string valor)
    {
        // Evita inyección de fórmulas al abrir en planillas de cálculo.
        if (valor.Length > 0 && "=+-@".Contains(valor[0]))
            valor = "'" + valor;

        return valor.IndexOfAny([';', '"', '\n', '\r']) >= 0
            ? $"\"{valor.Replace("\"", "\"\"")}\""
            : valor;
    }
}
