import { get, guardarToken, hayToken, post } from './api.js';
import { $, toast } from './ui.js';
import * as publico from './views/publico.js';
import * as conductor from './views/conductor.js';
import * as trabajador from './views/trabajador.js';
import * as admin from './views/admin.js';

const RUTAS = {
  '': publico.inicio,
  registro: publico.registro,
  transparencia: publico.transparencia,
  c: conductor.inicio,
  'c/estacionar': conductor.estacionar,
  'c/vehiculos': conductor.vehiculos,
  'c/saldo': conductor.saldo,
  'c/historial': conductor.historial,
  t: trabajador.inicio,
  't/consultar': trabajador.consultar,
  't/registrar': trabajador.registrar,
  't/acta': trabajador.acta,
  a: admin.panel,
  'a/monitoreo': admin.monitoreo,
  'a/trabajadores': admin.trabajadores,
  'a/cuadras': admin.cuadras,
  'a/actas': admin.actas,
  'a/config': admin.config,
};
const INICIO_ROL = { conductor: 'c', trabajador: 't', admin: 'a' };
const PUBLICAS = new Set(['', 'registro', 'transparencia']);

const estado = { usuario: null, params: null };
let limpiezas = [];

function leerRuta() {
  const [ruta, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return { ruta: ruta.replace(/\/$/, ''), query: new URLSearchParams(query) };
}

export function ir(ruta) {
  if (location.hash === `#/${ruta}`) navegar();
  else location.hash = `#/${ruta}`;
}

async function navegar() {
  limpiezas.forEach((fn) => fn());
  limpiezas = [];
  let { ruta, query } = leerRuta();

  if (estado.usuario) {
    const prefijo = INICIO_ROL[estado.usuario.rol];
    if (ruta === '' || ruta === 'registro' || (!PUBLICAS.has(ruta) && ruta.split('/')[0] !== prefijo)) return ir(prefijo);
  } else if (!PUBLICAS.has(ruta)) {
    return ir('');
  }
  const vista = RUTAS[ruta] || publico.inicio;
  const root = $('#app');
  try {
    await vista({
      root,
      ruta,
      query,
      usuario: estado.usuario,
      params: estado.params,
      ir,
      recargar: navegar,
      alSalir: (fn) => limpiezas.push(fn),
      iniciarSesion,
    });
    window.scrollTo?.({ top: 0 });
  } catch (e) {
    if (e.status === 401) return cerrarSesion(false);
    toast(e.message, 'error');
  }
}

async function iniciarSesion({ token, usuario }) {
  guardarToken(token);
  estado.usuario = usuario;
  ir(INICIO_ROL[usuario.rol]);
}

async function cerrarSesion(avisar = true) {
  await post('/auth/logout').catch(() => {});
  guardarToken(null);
  estado.usuario = null;
  if (avisar) toast('Cerraste sesión.');
  ir('');
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-salir]')) cerrarSesion();
});
window.addEventListener('hashchange', navegar);

async function arrancar() {
  estado.params = await get('/parametros').catch(() => ({}));
  estado.usuario = hayToken() ? await get('/me').catch(() => null) : null;
  if (!estado.usuario) guardarToken(null);
  navegar();
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('/sw.js').catch(() => {});
}
arrancar();
