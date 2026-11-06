using Microsoft.EntityFrameworkCore;
using PoliciaTucuman.Domain.Entidades;
using PoliciaTucuman.Domain.Enums;

namespace PoliciaTucuman.Infrastructure.Persistencia;

public class PoliciaDbContext(DbContextOptions<PoliciaDbContext> options) : DbContext(options)
{
    public const string SecuenciaCorrelativo = "denuncias_correlativo_seq";

    public DbSet<UnidadRegional> UnidadesRegionales => Set<UnidadRegional>();
    public DbSet<Dependencia> Dependencias => Set<Dependencia>();
    public DbSet<Personal> Personal => Set<Personal>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Denuncia> Denuncias => Set<Denuncia>();
    public DbSet<Actuacion> Actuaciones => Set<Actuacion>();
    public DbSet<Adjunto> Adjuntos => Set<Adjunto>();
    public DbSet<Movil> Moviles => Set<Movil>();
    public DbSet<RegistroAuditoria> Auditoria => Set<RegistroAuditoria>();
    public DbSet<CorreoSaliente> CorreosSalientes => Set<CorreoSaliente>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("unaccent");
        modelBuilder.HasSequence<long>(SecuenciaCorrelativo).StartsAt(1).IncrementsBy(1);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PoliciaDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Los enums se guardan como texto: la base queda legible y agregar valores no rompe datos existentes.
        builder.Properties<TipoDelito>().HaveConversion<string>().HaveMaxLength(40);
        builder.Properties<EstadoDenuncia>().HaveConversion<string>().HaveMaxLength(30);
        builder.Properties<Prioridad>().HaveConversion<string>().HaveMaxLength(20);
        builder.Properties<OrigenDenuncia>().HaveConversion<string>().HaveMaxLength(20);
        builder.Properties<TipoActuacion>().HaveConversion<string>().HaveMaxLength(20);
        builder.Properties<Jerarquia>().HaveConversion<string>().HaveMaxLength(30);
        builder.Properties<SituacionRevista>().HaveConversion<string>().HaveMaxLength(30);
        builder.Properties<RolUsuario>().HaveConversion<string>().HaveMaxLength(30);
        builder.Properties<TipoDependencia>().HaveConversion<string>().HaveMaxLength(30);
        builder.Properties<TipoMovil>().HaveConversion<string>().HaveMaxLength(20);
        builder.Properties<EstadoMovil>().HaveConversion<string>().HaveMaxLength(20);
        builder.Properties<EstadoCorreo>().HaveConversion<string>().HaveMaxLength(20);
    }
}
