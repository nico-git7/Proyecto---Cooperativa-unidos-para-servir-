using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Infrastructure.Persistencia.Configuraciones;

internal sealed class UnidadRegionalConfiguracion : IEntityTypeConfiguration<UnidadRegional>
{
    public void Configure(EntityTypeBuilder<UnidadRegional> builder)
    {
        builder.ToTable("unidades_regionales");
        builder.Property(u => u.Codigo).HasMaxLength(10).IsRequired();
        builder.Property(u => u.Nombre).HasMaxLength(80).IsRequired();
        builder.Property(u => u.Cabecera).HasMaxLength(80).IsRequired();
        builder.HasIndex(u => u.Codigo).IsUnique();
    }
}

internal sealed class DependenciaConfiguracion : IEntityTypeConfiguration<Dependencia>
{
    public void Configure(EntityTypeBuilder<Dependencia> builder)
    {
        builder.ToTable("dependencias");
        builder.Property(d => d.Nombre).HasMaxLength(120).IsRequired();
        builder.Property(d => d.Direccion).HasMaxLength(160).IsRequired();
        builder.Property(d => d.Localidad).HasMaxLength(80).IsRequired();
        builder.Property(d => d.Telefono).HasMaxLength(40);
        builder.Property(d => d.Email).HasMaxLength(120);

        builder.HasOne(d => d.UnidadRegional)
            .WithMany(u => u.Dependencias)
            .HasForeignKey(d => d.UnidadRegionalId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(d => d.Nombre).IsUnique();
    }
}

internal sealed class MovilConfiguracion : IEntityTypeConfiguration<Movil>
{
    public void Configure(EntityTypeBuilder<Movil> builder)
    {
        builder.ToTable("moviles");
        builder.Property(m => m.NumeroInterno).HasMaxLength(20).IsRequired();
        builder.Property(m => m.Dominio).HasMaxLength(10).IsRequired();
        builder.Property(m => m.Marca).HasMaxLength(40).IsRequired();
        builder.Property(m => m.Modelo).HasMaxLength(60).IsRequired();
        builder.Property(m => m.Observaciones).HasMaxLength(500);

        builder.HasOne(m => m.Dependencia)
            .WithMany()
            .HasForeignKey(m => m.DependenciaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(m => m.Dominio).IsUnique();
        builder.HasIndex(m => m.NumeroInterno).IsUnique();
    }
}
