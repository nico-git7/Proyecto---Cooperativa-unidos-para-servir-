using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Infrastructure.Persistencia.Configuraciones;

internal sealed class RegistroAuditoriaConfiguracion : IEntityTypeConfiguration<RegistroAuditoria>
{
    public void Configure(EntityTypeBuilder<RegistroAuditoria> builder)
    {
        builder.ToTable("auditoria");
        builder.Property(a => a.Usuario).HasMaxLength(160).IsRequired();
        builder.Property(a => a.Accion).HasMaxLength(60).IsRequired();
        builder.Property(a => a.Entidad).HasMaxLength(60).IsRequired();
        builder.Property(a => a.EntidadId).HasMaxLength(40);
        builder.Property(a => a.Detalle).HasMaxLength(1000);
        builder.Property(a => a.Ip).HasMaxLength(64);
        builder.HasIndex(a => a.Fecha);
        builder.HasIndex(a => new { a.Entidad, a.EntidadId });
    }
}

internal sealed class CorreoSalienteConfiguracion : IEntityTypeConfiguration<CorreoSaliente>
{
    public void Configure(EntityTypeBuilder<CorreoSaliente> builder)
    {
        builder.ToTable("correos_salientes");
        builder.Property(c => c.Destinatario).HasMaxLength(160).IsRequired();
        builder.Property(c => c.Plantilla).HasMaxLength(60).IsRequired();
        builder.Property(c => c.DatosJson).HasColumnType("jsonb").IsRequired();
        builder.Property(c => c.Referencia).HasMaxLength(120);
        builder.Property(c => c.UltimoError).HasMaxLength(500);
        builder.HasIndex(c => new { c.Estado, c.ProximoIntento });
    }
}
