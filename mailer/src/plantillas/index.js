import { bienvenida, restablecerPassword } from './cuentas.js';
import { avisoDependencia, denunciaActualizada, denunciaRecibida } from './denuncias.js';

export const plantillas = {
  'denuncia-recibida': denunciaRecibida,
  'denuncia-actualizada': denunciaActualizada,
  'aviso-dependencia': avisoDependencia,
  bienvenida,
  'restablecer-password': restablecerPassword,
};

export function renderizar(nombre, datos) {
  const plantilla = plantillas[nombre];
  if (!plantilla) {
    const error = new Error(`Plantilla desconocida: ${nombre}`);
    error.status = 400;
    throw error;
  }
  return plantilla(datos ?? {});
}
