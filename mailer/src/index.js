import { crearApp } from './app.js';
import { config } from './config.js';
import { crearTransporte } from './transporte.js';

const transporte = crearTransporte();

if (transporte.modo === 'smtp') {
  transporte
    .verify()
    .then(() => console.info(`[mailer] Conectado a ${config.smtp.host}:${config.smtp.port}`))
    .catch((error) => console.error(`[mailer] No se pudo verificar el servidor SMTP: ${error.message}`));
} else {
  console.warn(`[mailer] SMTP_HOST no configurado: los correos se guardan en ./${config.carpetaSalida}`);
}

if (!config.apiKey) {
  console.warn('[mailer] MAILER_API_KEY vacía: el servicio acepta pedidos sin autenticar.');
}

const servidor = crearApp(transporte).listen(config.puerto, () => {
  console.info(`[mailer] Escuchando en el puerto ${config.puerto}`);
});

const cerrar = () => servidor.close(() => process.exit(0));
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);
