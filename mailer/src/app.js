import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './config.js';
import { renderizar } from './plantillas/index.js';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const ESCUDO = path.join(raiz, '..', 'assets', 'escudo.png');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function claveValida(recibida) {
  if (!config.apiKey) return true;
  const a = Buffer.from(String(recibida ?? ''));
  const b = Buffer.from(config.apiKey);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function crearApp(transporte, logger = console) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  app.get('/salud', (_req, res) => res.json({ estado: 'ok', modo: transporte.modo }));

  app.post('/enviar', async (req, res) => {
    if (!claveValida(req.get('x-api-key'))) {
      return res.status(401).json({ error: 'Clave de acceso inválida.' });
    }

    const { para, plantilla, datos } = req.body ?? {};
    if (typeof para !== 'string' || !EMAIL.test(para)) {
      return res.status(400).json({ error: 'Destinatario inválido.' });
    }

    let mensaje;
    try {
      mensaje = renderizar(plantilla, datos);
    } catch (error) {
      return res.status(error.status ?? 500).json({ error: error.message });
    }

    try {
      const info = await transporte.sendMail({
        from: config.remitente,
        replyTo: config.responderA,
        to: para,
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
        plantilla,
        attachments: [{ filename: 'escudo.png', path: ESCUDO, cid: 'escudo' }],
      });
      logger.info(`[mailer] ${plantilla} -> ${para} (${info.messageId})`);
      return res.status(202).json({ id: info.messageId });
    } catch (error) {
      logger.error(`[mailer] Falló el envío de ${plantilla} a ${para}: ${error.message}`);
      return res.status(502).json({ error: 'No se pudo entregar el correo al servidor SMTP.' });
    }
  });

  return app;
}
