namespace PoliciaTucuman.Domain.Entidades;

public class UnidadRegional
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Cabecera { get; set; } = string.Empty;

    public ICollection<Dependencia> Dependencias { get; set; } = new List<Dependencia>();
}
