using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Infrastructure.Persistencia.Configuraciones;

internal sealed class DenunciaConfiguracion : IEntityTypeConfiguration<Denuncia>
{
    public void Configure(EntityTypeBuilder<Denuncia> builder)
    {
        builder.ToTable("denuncias");

        builder.Property(d => d.Correlativo)
            .HasDefaultValueSql($"nextval('{PoliciaDbContext.SecuenciaCorrelativo}')")
            .ValueGeneratedOnAdd();

        builder.Property(d => d.CodigoSeguimiento).HasMaxLength(9).IsRequired();
        builder.Property(d => d.LugarHecho).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Localidad).HasMaxLength(80).IsRequired();
        builder.Property(d => d.Relato).HasMaxLength(8000).IsRequired();
        builder.Property(d => d.BienesInvolucrados).HasMaxLength(2000);

        builder.OwnsOne(d => d.Denunciante, denunciante =>
        {
            denunciante.Property(p => p.Nombre).HasMaxLength(80).IsRequired();
            denunciante.Property(p => p.Apellido).HasMaxLength(80).IsRequired();
            denunciante.Property(p => p.Dni).HasMaxLength(8).IsRequired();
            denunciante.Property(p => p.Telefono).HasMaxLength(40);
            denunciante.Property(p => p.Email).HasMaxLength(120);
            denunciante.Property(p => p.Domicilio).HasMaxLength(160).IsRequired();
            denunciante.Property(p => p.Localidad).HasMaxLength(80).IsRequired();
            denunciante.HasIndex(p => p.Dni);
        });
        builder.Navigation(d => d.Denunciante).IsRequired();

        builder.HasOne(d => d.Dependencia)
            .WithMany()
            .HasForeignKey(d => d.DependenciaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.OficialAsignado)
            .WithMany()
            .HasForeignKey(d => d.OficialAsignadoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(d => d.Actuaciones)
            .WithOne()
            .HasForeignKey(a => a.DenunciaId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(d => d.Actuaciones).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(d => d.Adjuntos)
            .WithOne()
            .HasForeignKey(a => a.DenunciaId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(d => d.Adjuntos).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(d => d.CodigoSeguimiento).IsUnique();
        builder.HasIndex(d => new { d.Anio, d.Correlativo }).IsUnique();
        builder.HasIndex(d => new { d.DependenciaId, d.Estado });
        builder.HasIndex(d => d.CreadaEn);
        builder.HasIndex(d => d.Tipo);
    }
}

internal sealed class ActuacionConfiguracion : IEntityTypeConfiguration<Actuacion>
{
    public void Configure(EntityTypeBuilder<Actuacion> builder)
    {
        builder.ToTable("actuaciones");
        builder.Property(a => a.Descripcion).HasMaxLength(4000).IsRequired();
        builder.Property(a => a.DescripcionPublica).HasMaxLength(4000);

        builder.HasOne(a => a.Usuario)
            .WithMany()
            .HasForeignKey(a => a.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => new { a.DenunciaId, a.Fecha });
    }
}

internal sealed class AdjuntoConfiguracion : IEntityTypeConfiguration<Adjunto>
{
    public void Configure(EntityTypeBuilder<Adjunto> builder)
    {
        builder.ToTable("adjuntos");
        builder.Property(a => a.NombreOriginal).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Ruta).HasMaxLength(300).IsRequired();
        builder.Property(a => a.ContentType).HasMaxLength(100).IsRequired();
    }
}
