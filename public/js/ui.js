// Utilidades de interfaz: plantillas con escape automático, formato y avisos.

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(String(s));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function render(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

/** Plantilla HTML: escapa todo lo interpolado salvo lo que viene de html`` o raw(). */
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new Raw(out);
}

export function montar(el, plantilla) {
  el.innerHTML = render(plantilla);
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const fmtPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const pesos = (n) => fmtPesos.format(Number(n) || 0);
const fmtNum = new Intl.NumberFormat('es-AR');
export const numero = (n) => fmtNum.format(Number(n) || 0);
export const pesosCompacto = (n) =>
  Math.abs(n) >= 1e6 ? `$${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`
  : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3).toLocaleString('es-AR')} mil` : pesos(n);

const TZ = 'America/Argentina/Tucuman';
export const hora = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });
export const fecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: TZ });
export const fechaHora = (iso) => `${fecha(iso)} · ${hora(iso)}`;
export const diaCorto = (yyyyMmDd) =>
  new Date(`${yyyyMmDd}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).replace('.', '');

export function duracion(minutos) {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}

export function cronometro(desdeIso) {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(desdeIso)) / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export const cuadraTxt = (c) => `${c.calle} ${c.desde}–${c.hasta}`;

export const patente = (p, grande = false) => html`<span class="plate${grande ? ' lg' : ''}"><span>${p}</span></span>`;

export function toast(mensaje, tipo = 'info') {
  const el = document.createElement('div');
  el.className = `toast${tipo === 'error' ? ' error' : ''}`;
  el.textContent = mensaje;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3800);
}

/** Abre un diálogo modal; `contenido` recibe el elemento body para enganchar eventos. Devuelve una función para cerrarlo. */
export function modal(plantilla, alAbrir) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  montar(d, html`<div class="modal-body">${plantilla}</div>`);
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  const cerrar = () => d.close();
  d.showModal();
  alAbrir?.(d, cerrar);
  return cerrar;
}

export function confirmar(titulo, texto, { ok = 'Confirmar', peligro = false } = {}) {
  return new Promise((resolve) => {
    let respuesta = false;
    modal(html`<h2>${titulo}</h2><p class="muted">${texto}</p>
      <div class="grid-2"><button class="btn ghost" data-r="no">Cancelar</button>
      <button class="btn ${peligro ? 'danger' : 'primary'}" data-r="si">${ok}</button></div>`, (d, cerrar) => {
      d.addEventListener('close', () => resolve(respuesta));
      $$('[data-r]', d).forEach((b) => b.addEventListener('click', () => { respuesta = b.dataset.r === 'si'; cerrar(); }));
    });
  });
}

/** Ejecuta una acción async deshabilitando el botón y mostrando errores como aviso. */
export async function accion(boton, fn) {
  if (boton) boton.disabled = true;
  try {
    return await fn();
  } catch (e) {
    toast(e.message, 'error');
    return undefined;
  } finally {
    if (boton && boton.isConnected) boton.disabled = false;
  }
}

export function datosForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export const vacio = (texto) => html`<p class="muted center small" style="padding:16px 0">${texto}</p>`;
