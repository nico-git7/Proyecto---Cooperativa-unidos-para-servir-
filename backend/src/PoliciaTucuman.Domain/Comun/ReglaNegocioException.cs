namespace PoliciaTucuman.Domain.Comun;

/// <summary>
/// Violación de una regla del dominio. La API la traduce a 422 con el mensaje tal cual,
/// por eso el texto tiene que poder mostrarse al usuario.
/// </summary>
public class ReglaNegocioException(string mensaje) : Exception(mensaje);
