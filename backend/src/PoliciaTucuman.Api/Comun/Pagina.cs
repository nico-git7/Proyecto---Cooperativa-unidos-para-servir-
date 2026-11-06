namespace PoliciaTucuman.Api.Comun;

public sealed record Pagina<T>(IReadOnlyList<T> Items, int Total, int Numero, int Tamano)
{
    public int TotalPaginas => Tamano == 0 ? 0 : (int)Math.Ceiling(Total / (double)Tamano);
}

public record ParametrosPagina
{
    private int _pagina = 1;
    private int _tamano = 20;

    public int Pagina { get => _pagina; init => _pagina = Math.Max(1, value); }
    public int Tamano { get => _tamano; init => _tamano = Math.Clamp(value, 1, 100); }

    public int Saltear => (Pagina - 1) * Tamano;
}
