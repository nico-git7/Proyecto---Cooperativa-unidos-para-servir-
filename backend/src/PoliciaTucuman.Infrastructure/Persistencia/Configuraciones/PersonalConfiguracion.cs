using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PoliciaTucuman.Domain.Entidades;

namespace PoliciaTucuman.Infrastructure.Persistencia.Configuraciones;

internal sealed class PersonalConfiguracion : IEntityTypeConfiguration<Personal>
{
    public void Configure(EntityTypeBuilder<Personal> builder)
    {
        builder.ToTable("personal");
        builder.Property(p => p.Legajo).HasMaxLength(12).IsRequired();
        builder.Property(p => p.Apellido).HasMaxLength(80).IsRequired();
        builder.Property(p => p.Nombre).HasMaxLength(80).IsRequired();
        builder.Property(p => p.Dni).HasMaxLength(8).IsRequired();
        builder.Property(p => p.Email).HasMaxLength(120);
        builder.Property(p => p.Telefono).HasMaxLength(40);

        builder.HasOne(p => p.Dependencia)
            .WithMany()
            .HasForeignKey(p => p.DependenciaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.Legajo).IsUnique();
        builder.HasIndex(p => p.Dni).IsUnique();
        builder.HasIndex(p => new { p.Apellido, p.Nombre });
    }
}

internal sealed class UsuarioConfiguracion : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("usuarios");
        builder.Property(u => u.PasswordHash).HasMaxLength(200).IsRequired();
        builder.Property(u => u.TokenRestablecimientoHash).HasMaxLength(100);

        builder.HasOne(u => u.Personal)
            .WithOne(p => p.Usuario)
            .HasForeignKey<Usuario>(u => u.PersonalId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(u => u.PersonalId).IsUnique();
        builder.HasIndex(u => u.TokenRestablecimientoHash);
    }
}
