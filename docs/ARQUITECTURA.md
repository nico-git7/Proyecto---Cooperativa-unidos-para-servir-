# Arquitectura

## Componentes

| Servicio | Imagen | Función |
|---|---|---|
| `web` | Nginx 1.27 | Sirve la aplicación React compilada y hace de proxy inverso hacia la API (`/api`, `/hubs`). Comprime, agrega encabezados de seguridad y resuelve la IP real del visitante. |
| `api` | ASP.NET Core 8 | API REST, autenticación, reglas de negocio, canal en tiempo real (SignalR) y despacho de correos. |
| `db` | PostgreSQL 16 | Datos del sistema. Volumen `datos_postgres`. |
| `mailer` | Node 22 | Recibe pedidos de la API y envía los correos con Nodemailer usando plantillas HTML propias. Solo es accesible desde la red interna. |

Los archivos adjuntos y las claves de protección de datos de la API se guardan en el volumen `datos_api` (`/data`).

## Backend

```
PoliciaTucuman.Domain           sin dependencias externas
 ├─ Entidades                   Denuncia (agregado), Denunciante, Actuacion, Adjunto, Dependencia,
 │                              UnidadRegional, Personal, Usuario, Movil, RegistroAuditoria, CorreoSaliente
 ├─ Reglas                      FlujoDenuncia, Geografia (jurisdicción), PrioridadInicial,
 │                              CodigoSeguimiento, Documento
 └─ Comun                       ReglaNegocioException, HoraArgentina

PoliciaTucuman.Infrastructure   EF Core + Npgsql
 ├─ Persistencia                DbContext, configuraciones, migraciones, semillas
 ├─ Correo                      bandeja de salida, cliente del mailer, despachador en segundo plano
 ├─ Almacenamiento              adjuntos en disco con validación por firma de archivo
 └─ Seguridad                   hash de contraseñas (PBKDF2), tokens de restablecimiento

PoliciaTucuman.Api
 ├─ Modulos/<Modulo>            un controlador (y su servicio si hace falta) por área funcional
 ├─ Seguridad                   JWT en cookie, usuario actual, roles
 ├─ TiempoReal                  hub de SignalR y notificador
 └─ Comun                       errores como ProblemDetails, paginación, auditoría, CSV, validación
```

La entidad `Denuncia` concentra las reglas del expediente: no se puede avanzar sin instructor, el instructor tiene que pertenecer a la dependencia y estar en servicio efectivo, el cierre exige fundamento, solo se derivan denuncias que no están en investigación, etc. Cada operación genera una `Actuacion`; si tiene `DescripcionPublica`, la ve el denunciante en la consulta online. Así el historial interno y el público salen del mismo registro.

## Modelo de datos

```
unidades_regionales 1──* dependencias 1──* personal 1──0..1 usuarios
                                │                │
                                │                └──* denuncias (instructor)
                                ├──* denuncias 1──* actuaciones *──1 usuarios
                                │              1──* adjuntos
                                └──* moviles

auditoria            registro de operaciones (quién, qué, cuándo, desde qué IP)
correos_salientes    bandeja de salida con estado, intentos y último error
```

- Los enums se guardan como texto: la base se puede leer sin la aplicación.
- El número de denuncia sale de una secuencia de PostgreSQL (`denuncias_correlativo_seq`) y se muestra como `000123/2026`.
- El código de seguimiento (`K7M2-QX9P`) es aleatorio, sin caracteres ambiguos, y no permite deducir otros códigos.
- Búsqueda sin distinguir acentos con la extensión `unaccent` («gomez» encuentra «Gómez»).

## Flujo de una denuncia

```
Recibida ──▶ Asignada ──▶ En investigación ──▶ Elevada a Fiscalía ──▶ Resuelta
   │            │   └────────────┬─────────────────────┘
   │            │                ▼
   └──▶ Desestimada          Archivada ──(reapertura)──▶ En investigación
```

1. El ciudadano completa el formulario. Si marcó el lugar en el mapa, la API elige la dependencia territorial más cercana (fórmula de Haversine); si no, la primera de la localidad.
2. En una sola transacción se guardan la denuncia, sus archivos, la actuación inicial, el registro de auditoría y los correos a enviar.
3. SignalR avisa a los usuarios conectados de esa dependencia y a los administradores.
4. El jefe designa un instructor (la lista muestra cuántas causas abiertas tiene cada uno) y la denuncia pasa a *Asignada*.
5. Cada cambio de estado o nota marcada como informada genera un correo al denunciante y aparece en la consulta pública.

## Seguridad

- **Sesión**: JWT firmado con HMAC-SHA256 en una cookie `HttpOnly` y `SameSite=Strict` (el JavaScript no puede leerla y no viaja en pedidos de otros sitios). Duración de 10 horas, una guardia.
- **Contraseñas**: PBKDF2 con 100.000 iteraciones. Bloqueo de 15 minutos tras 5 intentos fallidos. Contraseña temporal obligatoria de cambiar en el primer ingreso. Restablecimiento con token de un solo uso, válido 30 minutos y guardado como hash.
- **Autorización**: tres roles. Jefes y operadores solo ven datos de su dependencia; la regla se aplica en el servidor en cada consulta, no en la interfaz.
- **Consulta pública**: requiere código y DNI, y responde lo mismo si falla cualquiera de los dos.
- **Archivos**: se valida el tipo real por los primeros bytes (JPG, PNG, WEBP, PDF), se limita el tamaño, se guardan con nombre aleatorio fuera de la carpeta pública y se descargan solo con sesión y acceso a la denuncia.
- **Límites de uso** por IP en ingreso, alta de denuncias y seguimiento.
- **CSV** con neutralización de fórmulas al exportar.
- **Auditoría** de accesos, altas, cambios, exportaciones y restablecimientos.
- **Nginx**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y HSTS en el VPS.

## Decisiones

| Decisión | Motivo |
|---|---|
| Correo en un servicio aparte con bandeja de salida | El envío no frena la respuesta al ciudadano; si el SMTP falla, nada se pierde y se reintenta. |
| SignalR para las novedades | El panel se actualiza solo cuando entra una denuncia: la guardia no tiene que recargar. |
| Validación en dominio y en API | Las reglas viven en las entidades; los DTO validan formato y la API devuelve errores en castellano con formato estándar (RFC 7807). |
| Migraciones automáticas al iniciar | Un `docker compose up` deja el sistema listo, sin pasos manuales en el servidor. |
| Una sola imagen por servicio y Nginx delante | Despliegue reproducible en cualquier VPS con Docker; el certificado lo maneja el Nginx del host. |
