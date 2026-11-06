#!/usr/bin/env bash
# Instalación en un VPS Ubuntu 22.04 / 24.04 (probado con la plantilla Ubuntu de Hostinger).
#
#   git clone -b policia-tucuman <url-del-repo> /opt/policia-tucuman
#   cd /opt/policia-tucuman
#   sudo bash deploy/instalar-vps.sh denuncias.midominio.com.ar admin@midominio.com.ar
#
# Sin dominio (acceso por IP): sudo bash deploy/instalar-vps.sh
set -euo pipefail

DOMINIO="${1:-}"
EMAIL_CERT="${2:-}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

paso() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

[[ $EUID -eq 0 ]] || { echo "Ejecutar con sudo."; exit 1; }

paso "Paquetes del sistema"
apt-get update -qq
apt-get install -y -qq ca-certificates curl git nginx ufw openssl >/dev/null

if ! command -v docker >/dev/null; then
  paso "Instalando Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Compilar la imagen de .NET con 4 GB de RAM es más estable con swap.
if ! swapon --show | grep -q .; then
  paso "Creando 2 GB de swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

paso "Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

if [[ ! -f .env ]]; then
  paso "Generando .env con claves aleatorias"
  cp .env.example .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^JWT_CLAVE=.*|JWT_CLAVE=$(openssl rand -hex 32)|" .env
  sed -i "s|^MAILER_API_KEY=.*|MAILER_API_KEY=$(openssl rand -hex 24)|" .env
  sed -i "s|^WEB_PUERTO=.*|WEB_PUERTO=127.0.0.1:8080|" .env
  if [[ -n "$DOMINIO" ]]; then
    sed -i "s|^URL_SITIO=.*|URL_SITIO=https://$DOMINIO|" .env
  else
    IP="$(curl -fs https://api.ipify.org || hostname -I | awk '{print $1}')"
    sed -i "s|^URL_SITIO=.*|URL_SITIO=http://$IP|" .env
  fi
  echo "Revisá los datos de SMTP en $RAIZ/.env para que salgan los correos."
fi

paso "Configurando Nginx"
sed "s|server_name DOMINIO;|server_name ${DOMINIO:-_};|" deploy/nginx/policia-tucuman.conf > /etc/nginx/sites-available/policia-tucuman
ln -sf /etc/nginx/sites-available/policia-tucuman /etc/nginx/sites-enabled/policia-tucuman
[[ -L /etc/nginx/sites-enabled/default ]] && unlink /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

paso "Construyendo y levantando los contenedores (la primera vez tarda unos minutos)"
docker compose up -d --build

if [[ -n "$DOMINIO" && -n "$EMAIL_CERT" ]]; then
  paso "Certificado HTTPS (Let's Encrypt)"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMINIO" -m "$EMAIL_CERT" --agree-tos --redirect -n
fi

paso "Respaldo diario a las 03:30"
cat > /etc/cron.d/policia-tucuman <<CRON
30 3 * * * root $RAIZ/deploy/respaldo.sh >> /var/log/policia-tucuman-respaldo.log 2>&1
CRON

paso "Listo"
docker compose ps
echo
echo "Sitio: $(grep ^URL_SITIO .env | cut -d= -f2)"
echo "Ingreso del personal: /intranet  (legajo 10001, contraseña definida en ADMIN_PASSWORD)"
