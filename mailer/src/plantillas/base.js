import { escapar } from '../formato.js';

const AZUL = '#0b2545';
const CELESTE = '#2b7bc0';
const GRIS_TEXTO = '#3d4a5c';
const GRIS_SUAVE = '#6b7787';
const BORDE = '#dfe4ea';

/** Fila de datos "etiqueta: valor" para las tablas de resumen. */
export const fila = (etiqueta, valor) =>
  valor
    ? `<tr>
        <td style="padding:8px 0;color:${GRIS_SUAVE};font-size:13px;width:38%;vertical-align:top">${escapar(etiqueta)}</td>
        <td style="padding:8px 0;color:${AZUL};font-size:14px;font-weight:600">${escapar(valor)}</td>
      </tr>`
    : '';

export const tablaDatos = (filas) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${BORDE};border-bottom:1px solid ${BORDE};margin:20px 0">
    ${filas.join('')}
  </table>`;

export const boton = (texto, url) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0">
    <tr><td style="background:${CELESTE};border-radius:4px">
      <a href="${escapar(url)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${escapar(texto)}</a>
    </td></tr>
  </table>`;

export const destacado = (etiqueta, valor) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0">
    <tr><td style="background:#f2f6fa;border-left:4px solid ${CELESTE};padding:14px 18px">
      <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${GRIS_SUAVE}">${escapar(etiqueta)}</div>
      <div style="font-size:22px;font-weight:700;color:${AZUL};letter-spacing:.04em;margin-top:4px;font-family:Consolas,Menlo,monospace">${escapar(valor)}</div>
    </td></tr>
  </table>`;

export const parrafo = (html) =>
  `<p style="margin:0 0 14px;color:${GRIS_TEXTO};font-size:15px;line-height:1.55">${html}</p>`;

/**
 * Estructura común de todos los correos: tablas y estilos en línea para que se vea igual en Gmail, Outlook y webmail.
 */
export function layout({ titulo, preencabezado, cuerpo, pie }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapar(preencabezado ?? '')}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f5;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDE}">
      <tr><td style="background:${AZUL};padding:18px 28px">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td style="padding-right:14px;vertical-align:middle"><img src="cid:escudo" width="40" height="46" alt="" style="display:block;border:0"></td>
          <td style="vertical-align:middle">
            <div style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.08em">POLICÍA DE TUCUMÁN</div>
            <div style="color:#a9c4e2;font-size:12px;letter-spacing:.04em;margin-top:2px">Comisaría Virtual</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;background:${CELESTE};line-height:4px;font-size:0">&nbsp;</td></tr>
      <tr><td style="padding:30px 28px 10px">
        <h1 style="margin:0 0 18px;color:${AZUL};font-size:20px;line-height:1.3">${escapar(titulo)}</h1>
        ${cuerpo}
      </td></tr>
      <tr><td style="padding:18px 28px 26px;border-top:1px solid ${BORDE}">
        <p style="margin:0 0 6px;color:${GRIS_SUAVE};font-size:12px;line-height:1.5">${pie ?? 'Este es un mensaje automático, por favor no lo respondas.'}</p>
        <p style="margin:0;color:${GRIS_SUAVE};font-size:12px;line-height:1.5"><strong style="color:${GRIS_TEXTO}">Ante una emergencia llamá al 911.</strong></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
