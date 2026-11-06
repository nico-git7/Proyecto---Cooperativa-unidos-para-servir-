const entero = (valor, porDefecto) => {
  const n = Number.parseInt(valor ?? '', 10);
  return Number.isNaN(n) ? porDefecto : n;
};

export const config = {
  puerto: entero(process.env.PORT, 4000),
  apiKey: process.env.MAILER_API_KEY ?? '',
  remitente: process.env.MAIL_FROM ?? '"Policía de Tucumán" <no-responder@policia.local>',
  responderA: process.env.MAIL_REPLY_TO || undefined,
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: entero(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  // Sin SMTP configurado los correos se guardan como .html en esta carpeta (modo desarrollo).
  carpetaSalida: process.env.MAILER_SALIDA ?? 'salida',
};
