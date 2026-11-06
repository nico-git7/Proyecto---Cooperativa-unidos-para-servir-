import { escapar } from '../formato.js';
import { boton, destacado, fila, layout, parrafo, tablaDatos } from './base.js';

const PIE_INTERNO = 'Mensaje del Sistema de Gestión Policial. Las credenciales son personales e intransferibles.';

export function bienvenida(d) {
  const asunto = d.nuevo ? 'Alta de usuario - Sistema de Gestión Policial' : 'Nueva contraseña temporal - Sistema de Gestión Policial';
  const html = layout({
    titulo: d.nuevo ? 'Tu usuario fue habilitado' : 'Se restableció tu contraseña',
    preencabezado: `Legajo ${d.legajo}`,
    cuerpo: [
      parrafo(`${escapar(d.jerarquia)} ${escapar(d.nombre)}:`),
      parrafo(d.nuevo
        ? 'Se habilitó tu acceso al Sistema de Gestión Policial. Ingresá con tu número de legajo y la contraseña temporal que figura abajo.'
        : 'La Dirección de Informática generó una nueva contraseña temporal para tu usuario.'),
      tablaDatos([fila('Usuario (legajo)', d.legajo)]),
      destacado('Contraseña temporal', d.password),
      parrafo('Al ingresar, el sistema te va a pedir que la cambies por una propia.'),
      boton('Ingresar al sistema', d.url),
    ].join(''),
    pie: PIE_INTERNO,
  });
  const texto = `Usuario: ${d.legajo}\nContraseña temporal: ${d.password}\nIngreso: ${d.url}`;
  return { asunto, html, texto };
}

export function restablecerPassword(d) {
  const asunto = 'Restablecer contraseña - Sistema de Gestión Policial';
  const html = layout({
    titulo: 'Restablecer contraseña',
    preencabezado: `El enlace vence en ${d.minutos} minutos.`,
    cuerpo: [
      parrafo(`Hola ${escapar(d.nombre)}:`),
      parrafo(`Recibimos un pedido para restablecer la contraseña del legajo <strong>${escapar(d.legajo)}</strong>. El enlace es válido por ${escapar(d.minutos)} minutos y se puede usar una sola vez.`),
      boton('Elegir una nueva contraseña', d.url),
      parrafo('Si no lo pediste, ignorá este mensaje: tu contraseña actual sigue siendo válida.'),
    ].join(''),
    pie: PIE_INTERNO,
  });
  const texto = `Para restablecer tu contraseña ingresá a: ${d.url}\nEl enlace vence en ${d.minutos} minutos.`;
  return { asunto, html, texto };
}
