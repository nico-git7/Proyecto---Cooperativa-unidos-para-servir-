# Despliegue en un VPS (Hostinger)

Con un VPS de 4 GB de RAM alcanza para todo el sistema (base de datos, API, servicio de correo y web). En Hostinger, el plan **KVM 1** (4 GB, 50 GB NVMe) es suficiente para la demo; el **KVM 2** (8 GB, 100 GB) deja margen para los archivos adjuntos de un uso real.

## 1. Crear el VPS

1. En hPanel → VPS, elegir el plan y la plantilla **Ubuntu 24.04** (sin panel de control).
2. Definir la contraseña de root o, mejor, cargar una clave SSH.
3. Anotar la IP pública.

## 2. Dominio (opcional, recomendado)

Para tener HTTPS hace falta un dominio o subdominio. En la zona DNS crear un registro:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `denuncias` (o `@`) | IP del VPS |

Esperar a que resuelva (`ping denuncias.midominio.com.ar`). Sin dominio, el sistema funciona igual por IP, pero en HTTP.

> La geolocalización del navegador («Usar mi ubicación») solo funciona con HTTPS. Por IP se puede marcar el lugar tocando el mapa.

## 3. Instalar

```bash
ssh root@IP_DEL_VPS

git clone -b policia-tucuman https://github.com/<usuario>/<repositorio>.git /opt/policia-tucuman
cd /opt/policia-tucuman

# Con dominio: instala Docker, Nginx, firewall, genera claves, levanta todo y pide el certificado
sudo bash deploy/instalar-vps.sh denuncias.midominio.com.ar correo@midominio.com.ar

# Sin dominio (por IP)
sudo bash deploy/instalar-vps.sh
```

El script:

- instala Docker, Nginx y certbot, y activa el firewall (solo SSH, 80 y 443);
- crea 2 GB de swap si no hay (la compilación de .NET la necesita en 4 GB);
- genera `.env` con claves aleatorias para la base, las sesiones y el servicio de correo;
- configura Nginx como proxy inverso hacia el contenedor web (publicado solo en `127.0.0.1:8080`);
- construye y levanta los contenedores;
- obtiene el certificado de Let's Encrypt y redirige HTTP a HTTPS;
- programa un respaldo diario a las 03:30.

La primera construcción tarda entre 5 y 10 minutos.

## 4. Configurar el correo

Editar `/opt/policia-tucuman/.env`:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=cuenta@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx        # contraseña de aplicación de Google
MAIL_FROM="Policía de Tucumán - Comisaría Virtual <cuenta@gmail.com>"
```

y aplicar: `docker compose up -d`.

Con Gmail, el remitente tiene que ser la misma cuenta (o un alias verificado). Para volumen real conviene un proveedor transaccional (Brevo, Mailgun, Amazon SES) con dominio propio y registros SPF/DKIM.

## 5. Verificar

```bash
docker compose ps                         # los cuatro servicios en "running"
curl -s http://127.0.0.1:8080/api/salud   # Healthy
docker compose logs -f api mailer         # migraciones, datos iniciales y envíos
```

Entrar a `https://denuncias.midominio.com.ar/intranet` con el legajo `10001` y la contraseña de `ADMIN_PASSWORD`.

## Operación

| Tarea | Comando (desde `/opt/policia-tucuman`) |
|---|---|
| Ver estado | `docker compose ps` |
| Ver registros | `docker compose logs -f --tail=100 api` |
| Reiniciar | `docker compose restart` |
| Actualizar a la última versión | `./deploy/actualizar.sh` |
| Respaldo manual | `sudo ./deploy/respaldo.sh` |
| Entrar a la base | `docker compose exec db psql -U policia policia_tucuman` |

### Respaldos

`deploy/respaldo.sh` guarda en `/var/backups/policia-tucuman` un volcado de la base (`base-AAAAMMDD-HHMM.dump`) y los adjuntos comprimidos, y conserva los últimos 14 días. Se recomienda copiar esa carpeta fuera del VPS (por ejemplo con `rclone` a Google Drive) o activar los backups semanales de Hostinger.

Restaurar la base:

```bash
docker compose exec -T db pg_restore -U policia -d policia_tucuman --clean --if-exists < /var/backups/policia-tucuman/base-20261106-0330.dump
```

Restaurar los adjuntos:

```bash
docker compose exec -T api tar xzf - -C /data/adjuntos < /var/backups/policia-tucuman/adjuntos-20261106-0330.tar.gz
```

### Pasar a producción

- `DATOS_DEMO=false` y una base vacía: solo se crea el usuario administrador, que debe cambiar la contraseña en el primer ingreso.
- `SWAGGER=false` para no exponer la documentación de la API.
- Cargar las dependencias reales con sus coordenadas (de ellas depende la asignación automática de jurisdicción) y un correo de aviso por dependencia.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `502 Bad Gateway` | La API todavía está iniciando o se cayó: `docker compose logs api`. |
| No llegan los correos | Revisar **Auditoría → Correos** en la intranet y `docker compose logs mailer`. Con Gmail, la contraseña tiene que ser de aplicación. |
| La compilación se corta | Falta memoria: verificar que la swap esté activa (`swapon --show`). |
| El aviso en tiempo real dice «Reconectando» | El proxy no deja pasar WebSocket: usar la configuración de `deploy/nginx/policia-tucuman.conf`. |
| Error al subir archivos grandes | Límite de 10 MB por archivo y 60 MB por denuncia; Nginx está configurado en `client_max_body_size 60m`. |
