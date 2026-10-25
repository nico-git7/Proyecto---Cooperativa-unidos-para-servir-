import { icono } from './icons.js';
import { html } from './ui.js';

export function marca(subtitulo = 'San Miguel de Tucumán') {
  return html`<a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">P</span>
    <span class="brand-text"><strong>Estacionamiento Solidario</strong><span>${subtitulo}</span></span></a>`;
}

export function barraSuperior(usuario, subtitulo) {
  return html`<header class="topbar">
    ${marca(subtitulo)}
    ${usuario ? html`<button class="icon-btn" data-salir title="Cerrar sesión" aria-label="Cerrar sesión">${icono('salir')}</button>` : ''}
  </header>`;
}

export function navInferior(items, actual) {
  return html`<nav class="bottom-nav" aria-label="Secciones"><ul>
    ${items.map((it) => html`<li><a href="#/${it.ruta}" ${it.ruta === actual ? html`aria-current="page"` : ''}>${icono(it.icono)}<span>${it.texto}</span></a></li>`)}
  </ul></nav>`;
}
