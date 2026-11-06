using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PoliciaTucuman.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:unaccent", ",,");

            migrationBuilder.CreateSequence(
                name: "denuncias_correlativo_seq");

            migrationBuilder.CreateTable(
                name: "auditoria",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    usuario = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    accion = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    entidad = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    entidad_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    detalle = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ip = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auditoria", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "correos_salientes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    destinatario = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    plantilla = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    datos_json = table.Column<string>(type: "jsonb", nullable: false),
                    referencia = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    intentos = table.Column<int>(type: "integer", nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    proximo_intento = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    enviado_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ultimo_error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_correos_salientes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "unidades_regionales",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    codigo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    cabecera = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_unidades_regionales", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "dependencias",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    unidad_regional_id = table.Column<int>(type: "integer", nullable: false),
                    direccion = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    localidad = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    telefono = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    email = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    latitud = table.Column<double>(type: "double precision", nullable: true),
                    longitud = table.Column<double>(type: "double precision", nullable: true),
                    recibe_denuncias = table.Column<bool>(type: "boolean", nullable: false),
                    activa = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_dependencias", x => x.id);
                    table.ForeignKey(
                        name: "fk_dependencias_unidades_regionales_unidad_regional_id",
                        column: x => x.unidad_regional_id,
                        principalTable: "unidades_regionales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "moviles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    numero_interno = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    dominio = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    marca = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    modelo = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    anio = table.Column<int>(type: "integer", nullable: false),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    dependencia_id = table.Column<int>(type: "integer", nullable: false),
                    kilometraje = table.Column<int>(type: "integer", nullable: false),
                    observaciones = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_moviles", x => x.id);
                    table.ForeignKey(
                        name: "fk_moviles_dependencias_dependencia_id",
                        column: x => x.dependencia_id,
                        principalTable: "dependencias",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "personal",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    legajo = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    apellido = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    dni = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    jerarquia = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    situacion = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    dependencia_id = table.Column<int>(type: "integer", nullable: false),
                    email = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    telefono = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    fecha_ingreso = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_personal", x => x.id);
                    table.ForeignKey(
                        name: "fk_personal_dependencias_dependencia_id",
                        column: x => x.dependencia_id,
                        principalTable: "dependencias",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "denuncias",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    anio = table.Column<int>(type: "integer", nullable: false),
                    correlativo = table.Column<long>(type: "bigint", nullable: false, defaultValueSql: "nextval('denuncias_correlativo_seq')"),
                    codigo_seguimiento = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                    tipo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    prioridad = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    origen = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    denunciante_nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    denunciante_apellido = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    denunciante_dni = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    denunciante_fecha_nacimiento = table.Column<DateOnly>(type: "date", nullable: true),
                    denunciante_telefono = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    denunciante_email = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    denunciante_domicilio = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    denunciante_localidad = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    fecha_hecho = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    lugar_hecho = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    localidad = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    latitud = table.Column<double>(type: "double precision", nullable: true),
                    longitud = table.Column<double>(type: "double precision", nullable: true),
                    relato = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    bienes_involucrados = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    dependencia_id = table.Column<int>(type: "integer", nullable: true),
                    oficial_asignado_id = table.Column<int>(type: "integer", nullable: true),
                    creada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    actualizada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    asignada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    cerrada_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_denuncias", x => x.id);
                    table.ForeignKey(
                        name: "fk_denuncias_dependencias_dependencia_id",
                        column: x => x.dependencia_id,
                        principalTable: "dependencias",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_denuncias_personal_oficial_asignado_id",
                        column: x => x.oficial_asignado_id,
                        principalTable: "personal",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    personal_id = table.Column<int>(type: "integer", nullable: false),
                    rol = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    debe_cambiar_password = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ultimo_acceso = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    accesos_fallidos = table.Column<int>(type: "integer", nullable: false),
                    bloqueado_hasta = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    token_restablecimiento_hash = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    token_restablecimiento_vence = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_usuarios", x => x.id);
                    table.ForeignKey(
                        name: "fk_usuarios_personal_personal_id",
                        column: x => x.personal_id,
                        principalTable: "personal",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "adjuntos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    denuncia_id = table.Column<int>(type: "integer", nullable: false),
                    nombre_original = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ruta = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    tamano_bytes = table.Column<long>(type: "bigint", nullable: false),
                    subido_en = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    subido_por_usuario_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_adjuntos", x => x.id);
                    table.ForeignKey(
                        name: "fk_adjuntos_denuncias_denuncia_id",
                        column: x => x.denuncia_id,
                        principalTable: "denuncias",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "actuaciones",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    denuncia_id = table.Column<int>(type: "integer", nullable: false),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    fecha = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    descripcion = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    descripcion_publica = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    estado_anterior = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    estado_nuevo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    usuario_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_actuaciones", x => x.id);
                    table.ForeignKey(
                        name: "fk_actuaciones_denuncias_denuncia_id",
                        column: x => x.denuncia_id,
                        principalTable: "denuncias",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_actuaciones_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_actuaciones_denuncia_id_fecha",
                table: "actuaciones",
                columns: new[] { "denuncia_id", "fecha" });

            migrationBuilder.CreateIndex(
                name: "ix_actuaciones_usuario_id",
                table: "actuaciones",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_adjuntos_denuncia_id",
                table: "adjuntos",
                column: "denuncia_id");

            migrationBuilder.CreateIndex(
                name: "ix_auditoria_entidad_entidad_id",
                table: "auditoria",
                columns: new[] { "entidad", "entidad_id" });

            migrationBuilder.CreateIndex(
                name: "ix_auditoria_fecha",
                table: "auditoria",
                column: "fecha");

            migrationBuilder.CreateIndex(
                name: "ix_correos_salientes_estado_proximo_intento",
                table: "correos_salientes",
                columns: new[] { "estado", "proximo_intento" });

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_anio_correlativo",
                table: "denuncias",
                columns: new[] { "anio", "correlativo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_codigo_seguimiento",
                table: "denuncias",
                column: "codigo_seguimiento",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_creada_en",
                table: "denuncias",
                column: "creada_en");

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_denunciante_dni",
                table: "denuncias",
                column: "denunciante_dni");

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_dependencia_id_estado",
                table: "denuncias",
                columns: new[] { "dependencia_id", "estado" });

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_oficial_asignado_id",
                table: "denuncias",
                column: "oficial_asignado_id");

            migrationBuilder.CreateIndex(
                name: "ix_denuncias_tipo",
                table: "denuncias",
                column: "tipo");

            migrationBuilder.CreateIndex(
                name: "ix_dependencias_nombre",
                table: "dependencias",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_dependencias_unidad_regional_id",
                table: "dependencias",
                column: "unidad_regional_id");

            migrationBuilder.CreateIndex(
                name: "ix_moviles_dependencia_id",
                table: "moviles",
                column: "dependencia_id");

            migrationBuilder.CreateIndex(
                name: "ix_moviles_dominio",
                table: "moviles",
                column: "dominio",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_moviles_numero_interno",
                table: "moviles",
                column: "numero_interno",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_personal_apellido_nombre",
                table: "personal",
                columns: new[] { "apellido", "nombre" });

            migrationBuilder.CreateIndex(
                name: "ix_personal_dependencia_id",
                table: "personal",
                column: "dependencia_id");

            migrationBuilder.CreateIndex(
                name: "ix_personal_dni",
                table: "personal",
                column: "dni",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_personal_legajo",
                table: "personal",
                column: "legajo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_unidades_regionales_codigo",
                table: "unidades_regionales",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_personal_id",
                table: "usuarios",
                column: "personal_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_token_restablecimiento_hash",
                table: "usuarios",
                column: "token_restablecimiento_hash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "actuaciones");

            migrationBuilder.DropTable(
                name: "adjuntos");

            migrationBuilder.DropTable(
                name: "auditoria");

            migrationBuilder.DropTable(
                name: "correos_salientes");

            migrationBuilder.DropTable(
                name: "moviles");

            migrationBuilder.DropTable(
                name: "usuarios");

            migrationBuilder.DropTable(
                name: "denuncias");

            migrationBuilder.DropTable(
                name: "personal");

            migrationBuilder.DropTable(
                name: "dependencias");

            migrationBuilder.DropTable(
                name: "unidades_regionales");

            migrationBuilder.DropSequence(
                name: "denuncias_correlativo_seq");
        }
    }
}
