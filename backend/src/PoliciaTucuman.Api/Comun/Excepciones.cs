namespace PoliciaTucuman.Api.Comun;

public sealed class NoEncontradoException(string mensaje) : Exception(mensaje);

public sealed class AccesoDenegadoException(string mensaje) : Exception(mensaje);

public sealed class ConflictoException(string mensaje) : Exception(mensaje);
