import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { config } from './config.js';

export function crearTransporte() {
  const { smtp } = config;

  if (!smtp.host) {
    return {
      modo: 'archivo',
      async sendMail(mensaje) {
        await fs.mkdir(config.carpetaSalida, { recursive: true });
        const marca = new Date().toISOString().replace(/[:.]/g, '-');
        const archivo = path.join(config.carpetaSalida, `${marca}-${mensaje.plantilla}.html`);
        await fs.writeFile(archivo, mensaje.html, 'utf8');
        return { messageId: `archivo:${archivo}` };
      },
      verify: async () => true,
    };
  }

  const transporte = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    pool: true,
    maxConnections: 3,
  });
  transporte.modo = 'smtp';
  return transporte;
}
