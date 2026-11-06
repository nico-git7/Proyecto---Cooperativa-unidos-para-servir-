import { escapar, formatearFecha } from '../formato.js';
import { boton, destacado, fila, layout, parrafo, tablaDatos } from './base.js';

const datosDependencia = (dependencia) =>
  dependencia
    ? [
        fila('Dependencia', dependencia.nombre),
        fila('Dirección', [dependencia.direccion, dependencia.localidad].filter(Boolean).join(', ')),
        fila('Teléfono', dependencia.telefono),
      ]
    : [];

export function denunciaRecibida(d) {
  const asunto = `Denuncia N° ${d.numero} recibida`;
  const html = layout({
    titulo: 'Recibimos tu denuncia',
    preencabezado: `Número ${d.numero}. Guardá el código de seguimiento ${d.codigo}.`,
    cuerpo: [
      parrafo(`Hola ${escapar(d.nombre)}:`),
      parrafo('Tu denuncia fue registrada correctamente en la Comisaría Virtual y remitida a la dependencia con jurisdicción en el lugar del hecho.'),
      destacado('Código de seguimiento', d.codigo),
      parrafo('Con este código y tu DNI podés consultar en todo momento el estado del trámite.'),
      tablaDatos([
        fila('Número de denuncia', d.numero),
        fila('Tipo de hecho', d.tipo),
        fila('Fecha de la denuncia', formatearFecha(d.fecha)),
        fila('Fecha del hecho', formatearFecha(d.fechaHecho)),
        fila('Lugar del hecho', d.lugar),
        ...datosDependencia(d.dependencia),
      ]),
      boton('Consultar el estado', d.urlSeguimiento),
      parrafo('Si la dependencia necesita ampliar tu declaración, se comunicará con vos por teléfono o por este medio.'),
    ].join(''),
  });

  const texto = [
    `Hola ${d.nombre}:`,
    '',
    `Tu denuncia N° ${d.numero} fue registrada correctamente.`,
    `Código de seguimiento: ${d.codigo}`,
    `Tipo de hecho: ${d.tipo}`,
    d.dependencia ? `Dependencia: ${d.dependencia.nombre} (${d.dependencia.direccion})` : '',
    '',
    `Consultá el estado en: ${d.urlSeguimiento}`,
  ].filter((l) => l !== undefined).join('\n');

  return { asunto, html, texto };
}

export function denunciaActualizada(d) {
  const asunto = `Novedades en tu denuncia N° ${d.numero}`;
  const html = layout({
    titulo: 'Hay novedades en tu denuncia',
    preencabezado: d.mensaje,
    cuerpo: [
      parrafo(`Hola ${escapar(d.nombre)}:`),
      parrafo(`Se registró un nuevo movimiento en la denuncia <strong>N° ${escapar(d.numero)}</strong>.`),
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0">
        <tr><td style="background:#f2f6fa;padding:16px 18px;border:1px solid #dfe4ea">
          <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b7787">Estado actual</div>
          <div style="font-size:17px;font-weight:700;color:#0b2545;margin:4px 0 10px">${escapar(d.estado)}</div>
          <div style="font-size:15px;color:#3d4a5c;line-height:1.5">${escapar(d.mensaje)}</div>
          <div style="font-size:12px;color:#6b7787;margin-top:10px">${escapar(formatearFecha(d.fecha))}</div>
        </td></tr>
      </table>`,
      tablaDatos(datosDependencia(d.dependencia)),
      boton('Ver el detalle', d.urlSeguimiento),
    ].join(''),
  });

  const texto = `Hola ${d.nombre}:\n\nNovedades en la denuncia N° ${d.numero}.\nEstado: ${d.estado}\n${d.mensaje}\n\nDetalle: ${d.urlSeguimiento}`;
  return { asunto, html, texto };
}

export function avisoDependencia(d) {
  const asunto = `[${d.prioridad}] Nueva denuncia N° ${d.numero} - ${d.tipo}`;
  const html = layout({
    titulo: 'Nueva denuncia en su jurisdicción',
    preencabezado: `${d.tipo} - ${d.lugar}`,
    cuerpo: [
      parrafo(`Ingresó por Comisaría Virtual una denuncia con jurisdicción en <strong>${escapar(d.dependencia)}</strong>.`),
      tablaDatos([
        fila('Número', d.numero),
        fila('Tipo de hecho', d.tipo),
        fila('Prioridad', d.prioridad),
        fila('Lugar', d.lugar),
        fila('Fecha del hecho', formatearFecha(d.fechaHecho)),
      ]),
      boton('Abrir en el sistema', d.url),
    ].join(''),
    pie: 'Aviso interno del Sistema de Gestión Policial.',
  });
  const texto = `Nueva denuncia N° ${d.numero} (${d.tipo}, prioridad ${d.prioridad}) en ${d.lugar}.\n${d.url}`;
  return { asunto, html, texto };
}
