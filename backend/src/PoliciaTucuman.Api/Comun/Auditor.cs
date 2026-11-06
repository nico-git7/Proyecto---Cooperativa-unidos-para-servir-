using PoliciaTucuman.Api.Seguridad;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Infrastructure.Persistencia;

namespace PoliciaTucuman.Api.Comun;

/// <summary>Agrega el registro de auditoría al contexto; se guarda junto con la operación auditada.</summary>
public sealed class Auditor(PoliciaDbContext db, UsuarioActual usuario, TimeProvider reloj)
{
    public void Registrar(string accion, string entidad, object? entidadId = null, string? detalle = null, int? usuarioId = null, string? descripcionUsuario = null)
    {
        db.Auditoria.Add(new RegistroAuditoria
        {
            Fecha = reloj.GetUtcNow(),
            UsuarioId = usuarioId ?? (usuario.Autenticado ? usuario.Id : null),
            Usuario = descripcionUsuario ?? usuario.Descripcion,
            Accion = accion,
            Entidad = entidad,
            EntidadId = entidadId?.ToString(),
            Detalle = detalle is { Length: > 1000 } ? detalle[..1000] : detalle,
            Ip = usuario.Ip,
        });
    }
}
