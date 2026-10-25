import { descargar, get, patch, post, put } from '../api.js';
import { icono } from '../icons.js';
import { barraSuperior } from '../layout.js';
import { normalizarPatente } from '../reglas.js';
import {
  $, $$, accion, confirmar, cuadraTxt, datosForm, diaCorto, duracion, esc, fechaHora, hora, html, modal, montar, numero,
  patente, pesos, pesosCompacto, raw, toast, vacio,
} from '../ui.js';

const NAV = [
  { ruta: 'a', texto: 'Panel', icono: 'grafico' },
  { ruta: 'a/monitoreo', texto: 'En vivo', icono: 'monitor' },
  { ruta: 'a/trabajadores', texto: 'Trabajadores/as', icono: 'usuarios' },
  { ruta: 'a/cuadras', texto: 'Cuadras y tarifas', icono: 'mapa' },
  { ruta: 'a/actas', texto: 'Actas', icono: 'acta' },
  { ruta: 'a/config', texto: 'Configuración', icono: 'ajustes' },
];
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

function pagina(ctx, contenido) {
  montar(ctx.root, html`<div class="app-shell wide">
    ${barraSuperior(ctx.usuario, 'Administración · APARKAR LTDA y UNIDOS PARA SERVIR')}
    <div class="admin-layout">
      <nav class="side-nav" aria-label="Secciones">${NAV.map((n) => html`<a href="#/${n.ruta}" ${n.ruta === ctx.ruta ? html`aria-current="page"` : ''}>${icono(n.icono)}${n.texto}</a>`)}</nav>
      <main>${contenido}</main>
    </div>
  </div>`);
}

const kpi = (label, value, sub = '') => html`<div class="card kpi"><span class="label">${label}</span><span class="value">${value}</span>${sub ? html`<span class="sub">${sub}</span>` : ''}</div>`;

/** Barras apiladas (app + efectivo) por día, con un solo eje y tooltip por barra. */
function graficoDias(dias) {
  const W = 640, H = 220, M = { t: 18, r: 8, b: 26, l: 48 };
  const max = Math.max(1, ...dias.map((d) => d.app + d.efectivo));
  const paso = 10 ** Math.floor(Math.log10(max));
  const tope = Math.ceil(max / paso) * paso;
  const y = (v) => M.t + (H - M.t - M.b) * (1 - v / tope);
  const banda = (W - M.l - M.r) / dias.length;
  const ancho = Math.min(46, banda * 0.6);
  const ticks = [0, 0.5, 1].map((f) => f * tope);
  const r = 4;
  const barra = (x, y0, y1, color, redondear) => {
    const h = Math.max(0, y0 - y1);
    if (h <= 0) return '';
    if (!redondear || h < r) return `<rect x="${x}" y="${y1}" width="${ancho}" height="${h}" fill="${color}"/>`;
    return `<path d="M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + ancho - r} Q${x + ancho},${y1} ${x + ancho},${y1 + r} V${y0} Z" fill="${color}"/>`;
  };
  let svg = ticks.map((t) => `<line class="gridline" x1="${M.l}" x2="${W - M.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${M.l - 8}" y="${y(t) + 4}" text-anchor="end">${esc(pesosCompacto(t))}</text>`).join('');
  dias.forEach((d, i) => {
    const x = M.l + banda * i + (banda - ancho) / 2;
    const yApp = y(d.app);
    const yTot = y(d.app + d.efectivo);
    svg += barra(x, y(0), yApp, 'var(--s1)', d.efectivo === 0);
    // 2px de separación entre segmentos apilados
    svg += barra(x, yApp - (d.app ? 2 : 0), yTot, 'var(--s2)', true);
    svg += `<text x="${x + ancho / 2}" y="${H - 8}" text-anchor="middle">${esc(diaCorto(d.fecha))}</text>`;
    svg += `<rect class="hit" data-i="${i}" x="${M.l + banda * i}" y="${M.t}" width="${banda}" height="${H - M.t - M.b}"/>`;
  });
  return html`<div class="chart" data-chart>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recaudación de los últimos 7 días, por medio de pago">${raw(svg)}</svg>
    <div class="tip hidden"></div></div>`;
}

function engancharTooltip(dias) {
  const cont = $('[data-chart]');
  if (!cont) return;
  const tip = $('.tip', cont);
  $$('.hit', cont).forEach((h) => {
    h.addEventListener('pointerenter', () => {
      const d = dias[Number(h.dataset.i)];
      montar(tip, html`<strong>${diaCorto(d.fecha)}</strong>
        <div class="row"><span><span class="dot" style="background:var(--s1)"></span> App</span><span class="num">${pesos(d.app)}</span></div>
        <div class="row"><span><span class="dot" style="background:var(--s2)"></span> Efectivo</span><span class="num">${pesos(d.efectivo)}</span></div>
        <div class="row"><strong>Total</strong><strong class="num">${pesos(d.app + d.efectivo)}</strong></div>`);
      const svg = $('svg', cont).getBoundingClientRect();
      const b = h.getBoundingClientRect();
      tip.style.left = `${b.left - svg.left + b.width / 2}px`;
      tip.style.top = `${Math.max(70, b.top - svg.top + 30)}px`;
      tip.classList.remove('hidden');
    });
    h.addEventListener('pointerleave', () => tip.classList.add('hidden'));
  });
}

export async function panel(ctx) {
  const d = await get('/admin/dashboard');
  const semana = d.ultimos_7_dias.reduce((s, x) => s + x.app + x.efectivo, 0);
  pagina(ctx, html`
    <div class="row between wrap" style="margin-bottom:12px"><h1 style="margin:0">Panel general</h1>
      <button class="btn ghost sm" id="csv">${icono('descarga')} Exportar CSV del mes</button></div>
    <div class="kpi-grid">
      ${kpi('Recaudado hoy', pesos(d.hoy.total), `${numero(d.hoy.cantidad)} estacionamientos cerrados`)}
      ${kpi('En curso ahora', pesos(d.hoy.en_curso), `${d.activos} vehículos estacionados`)}
      ${kpi('Recaudado en el mes', pesosCompacto(d.mes.total), `${numero(d.mes.cantidad)} estacionamientos`)}
      ${kpi('Trabajadores/as en jornada', `${d.trabajadores.en_jornada}/${d.trabajadores.total}`, 'Asistencia registrada')}
    </div>

    ${d.actas_pendientes || d.efectivo_a_rendir ? html`<div class="row wrap" style="margin-top:12px">
      ${d.actas_pendientes ? html`<a class="badge warn" href="#/a/actas" style="text-decoration:none;padding:6px 12px">${icono('alerta')} ${d.actas_pendientes} actas pendientes de validar</a>` : ''}
      ${d.efectivo_a_rendir ? html`<a class="badge warn" href="#/a/trabajadores" style="text-decoration:none;padding:6px 12px">${icono('efectivo')} ${pesos(d.efectivo_a_rendir)} en efectivo a rendir</a>` : ''}
    </div>` : ''}

    <div class="dash-grid" style="margin-top:16px">
      <section class="card stack">
        <div class="row between wrap"><h2 style="margin:0">Últimos 7 días</h2><span class="muted small">${pesos(semana)} en total</span></div>
        <div class="legend"><span><i style="background:var(--s1)"></i>App · ${pesos(d.ultimos_7_dias.reduce((s, x) => s + x.app, 0))}</span>
          <span><i style="background:var(--s2)"></i>Efectivo · ${pesos(d.ultimos_7_dias.reduce((s, x) => s + x.efectivo, 0))}</span></div>
        ${graficoDias(d.ultimos_7_dias)}
        <details class="small"><summary class="muted">Ver como tabla</summary>
          <table class="table"><thead><tr><th>Día</th><th class="r">App</th><th class="r">Efectivo</th><th class="r">Total</th></tr></thead>
          <tbody>${d.ultimos_7_dias.map((x) => html`<tr><td>${diaCorto(x.fecha)}</td><td class="r num">${pesos(x.app)}</td><td class="r num">${pesos(x.efectivo)}</td><td class="r num">${pesos(x.app + x.efectivo)}</td></tr>`)}</tbody></table>
        </details>
      </section>

      <section class="card stack">
        <h2 style="margin:0">Ocupación por zona</h2>
        ${d.zonas.map((z) => {
          const pct = z.capacidad ? Math.round((z.ocupados / z.capacidad) * 100) : 0;
          return html`<div class="stack" style="gap:6px"><div class="row between"><span><span class="dot" style="background:${z.color}"></span> <strong>${z.nombre}</strong> <span class="small muted">${pesos(z.tarifa_hora)}/h</span></span>
            <span class="small num"><strong>${pct}%</strong> · ${z.ocupados}/${z.capacidad}</span></div>
            <span class="meter ${pct > 90 ? 'full' : pct > 70 ? 'warn' : ''}"><span style="width:${Math.min(100, pct)}%"></span></span></div>`;
        })}
      </section>

      <section class="card stack">
        <div class="row between wrap"><h2 style="margin:0">Distribución del mes</h2><span class="small muted">Propuesta configurable</span></div>
        <div class="dist-bar">${d.distribucion_mes.map((x, i) => html`<span style="width:${x.porcentaje}%;background:${SERIES[i]}" title="${x.nombre}"></span>`)}</div>
        <div class="list">${d.distribucion_mes.map((x, i) => html`<div class="list-item"><span class="dot" style="background:${SERIES[i]}"></span>
          <span class="grow">${x.nombre} <span class="small muted">${x.porcentaje}%</span></span><strong class="num">${pesos(x.monto)}</strong></div>`)}</div>
      </section>

      <section class="card stack">
        <h2 style="margin:0">Cuadras con más recaudación</h2>
        <div class="list">${d.ranking_cuadras.map((c, i) => html`<div class="list-item"><span class="badge">${i + 1}</span>
          <span class="grow"><span class="title ellipsis">${cuadraTxt(c)}</span><br><span class="small muted">${c.trabajador || 'Sin asignar'} · ${numero(c.cantidad)} vehículos</span></span>
          <strong class="num">${pesosCompacto(c.total)}</strong></div>`)}</div>
      </section>
    </div>
  `);
  engancharTooltip(d.ultimos_7_dias);
  $('#csv').addEventListener('click', (e) => accion(e.currentTarget, () => descargar('/admin/estacionamientos.csv', 'estacionamientos.csv')));
  const t = setInterval(() => document.visibilityState === 'visible' && ctx.recargar(), 60000);
  ctx.alSalir(() => clearInterval(t));
}

export async function monitoreo(ctx) {
  const lista = await get('/admin/estacionamientos?estado=activo');
  pagina(ctx, html`
    <div class="row between wrap"><h1 style="margin:0">En vivo</h1><span class="badge primary">${lista.length} vehículos estacionados</span></div>
    <input class="input" id="filtro" placeholder="Buscar patente, calle, trabajador/a o ID…" style="margin:14px 0">
    <div class="card"><div class="table-wrap"><table class="table">
      <thead><tr><th>Patente</th><th>Cuadra</th><th>Medio</th><th>Desde</th><th class="r">Tiempo</th><th class="r">Monto actual</th><th></th></tr></thead>
      <tbody>${lista.map((e) => html`<tr data-buscar="${`${e.patente} ${e.calle} ${e.cuadra_codigo} ${e.trabajador || ''} ${e.trabajador_legajo || ''} ${(e.trabajador_legajo || '').replace('-', '')}`.toLowerCase()}">
        <td>${patente(e.patente)}</td><td><span class="dot" style="background:${e.zona_color}"></span> ${cuadraTxt(e)}<br><span class="small muted">${e.trabajador ? `${e.trabajador} · ${e.trabajador_legajo}` : ''}</span></td>
        <td><span class="badge ${e.medio === 'app' ? 'primary' : 'warn'}">${e.medio === 'app' ? 'App' : 'Efectivo'}</span></td>
        <td class="num">${hora(e.inicio)}</td><td class="r num">${duracion(e.minutos_transcurridos)}</td><td class="r num"><strong>${pesos(e.monto_actual)}</strong></td>
        <td class="r"><button class="btn ghost sm" data-cerrar="${e.id}" data-patente="${e.patente}">Cerrar</button></td></tr>`)}</tbody>
    </table></div>${lista.length ? '' : vacio('No hay vehículos estacionados en este momento.')}</div>
  `);
  $('#filtro').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const qp = normalizarPatente(q).toLowerCase();
    $$('[data-buscar]').forEach((tr) => tr.classList.toggle('hidden', Boolean(q) && !tr.dataset.buscar.includes(q) && !(qp && tr.dataset.buscar.includes(qp))));
  });
  $$('[data-cerrar]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar(`¿Cerrar el estacionamiento de ${b.dataset.patente}?`, 'Se cobra el tiempo transcurrido hasta ahora. Usalo si el conductor/a olvidó finalizarlo.', { ok: 'Cerrar', peligro: true }))) return;
    accion(b, async () => { await post(`/admin/estacionamientos/${b.dataset.cerrar}/finalizar`); toast('Estacionamiento cerrado.'); ctx.recargar(); });
  }));
}

export async function trabajadores(ctx) {
  const lista = await get('/admin/trabajadores');
  pagina(ctx, html`
    <div class="row between wrap"><h1 style="margin:0">Trabajadores/as</h1><button class="btn primary sm" id="nuevo">${icono('mas')} Alta de trabajador/a</button></div>
    <p class="muted small" style="margin-top:8px">Recaudación y horas del mes en curso.</p>
    <div class="card"><div class="table-wrap"><table class="table">
      <thead><tr><th>Nombre</th><th>Cooperativa</th><th>Cuadras</th><th>Estado</th><th class="r">Horas</th><th class="r">Recaudado</th><th class="r">Efectivo a rendir</th><th></th></tr></thead>
      <tbody>${lista.map((u) => html`<tr style="${u.activo ? '' : 'opacity:.55'}">
        <td><strong>${u.nombre}</strong><br><span class="small muted">ID <strong>${u.legajo || '—'}</strong> · DNI ${u.dni || '—'}</span></td>
        <td class="small">${u.cooperativa}</td>
        <td class="small">${u.cuadras.length ? u.cuadras.map((c) => html`<span class="badge" style="margin:1px">${c.codigo}</span>`) : html`<span class="muted">—</span>`}</td>
        <td>${!u.activo ? html`<span class="badge">Inactivo</span>` : u.en_jornada ? html`<span class="badge ok">En jornada</span>` : html`<span class="badge">Fuera de turno</span>`}</td>
        <td class="r num">${String(u.horas_mes).replace('.', ',')}</td>
        <td class="r num">${pesos(u.recaudado_mes)}</td>
        <td class="r num">${u.efectivo_a_rendir ? html`<button class="btn accent sm" data-rendir="${u.id}" data-nombre="${u.nombre}" data-monto="${u.efectivo_a_rendir}">${pesos(u.efectivo_a_rendir)}</button>` : html`<span class="muted">—</span>`}</td>
        <td class="r"><button class="btn ghost sm" data-activo="${u.id}" data-valor="${u.activo ? '0' : '1'}">${u.activo ? 'Dar de baja' : 'Reactivar'}</button></td>
      </tr>`)}</tbody></table></div></div>
  `);

  $$('[data-rendir]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar('Registrar rendición', `¿${b.dataset.nombre} entregó ${pesos(b.dataset.monto)} en efectivo?`, { ok: 'Sí, recibido' }))) return;
    accion(b, async () => { const r = await post(`/admin/trabajadores/${b.dataset.rendir}/rendir`); toast(`Rendición de ${pesos(r.rendido)} registrada.`); ctx.recargar(); });
  }));
  $$('[data-activo]').forEach((b) => b.addEventListener('click', () =>
    accion(b, async () => { await patch(`/admin/trabajadores/${b.dataset.activo}`, { activo: b.dataset.valor === '1' }); ctx.recargar(); })));
  $('#nuevo').addEventListener('click', () => modal(html`<h2>Alta de trabajador/a</h2>
    <form class="stack" id="alta">
      <label class="field">Nombre y apellido<input class="input" name="nombre" required></label>
      <div class="grid-2"><label class="field">DNI<input class="input" name="dni" required inputmode="numeric"></label>
        <label class="field">ID (opcional)<input class="input" name="legajo" placeholder="Se genera solo" maxlength="12"></label></div>
      <label class="field">Email<input class="input" name="email" type="email" required></label>
      <label class="field">Teléfono<input class="input" name="telefono" type="tel"></label>
      <label class="field">Cooperativa<select class="input" name="cooperativa"><option>APARKAR LTDA</option><option>UNIDOS PARA SERVIR</option></select></label>
      <p class="hint" style="margin:0">El ID es el que el conductor/a ingresa en la app al estacionar; si lo dejás vacío se genera solo (ej.: APK-109). La contraseña inicial es el DNI. Después asignale cuadras en "Cuadras y tarifas".</p>
      <button class="btn primary block" type="submit">Dar de alta</button>
    </form>`, (d, cerrar) => {
    $('#alta', d).addEventListener('submit', (e) => {
      e.preventDefault();
      accion(e.submitter, async () => { await post('/admin/trabajadores', datosForm(e.target)); cerrar(); toast('Trabajador/a dado de alta.'); ctx.recargar(); });
    });
  }));
}

export async function cuadras(ctx) {
  const [zonas, lista, trab] = await Promise.all([get('/zonas'), get('/admin/cuadras'), get('/admin/trabajadores')]);
  const activos = trab.filter((t) => t.activo);
  pagina(ctx, html`
    <h1>Cuadras y tarifas</h1>
    ${zonas.map((z) => html`<section class="card stack" style="margin-bottom:14px">
      <div class="row between wrap">
        <h2 style="margin:0"><span class="dot" style="background:${z.color}"></span> ${z.nombre} <span class="small muted" style="font-weight:400">${z.descripcion}</span></h2>
        <form class="row" data-tarifa="${z.id}"><label class="small muted" for="t${z.id}">$/hora</label>
          <input class="input num" id="t${z.id}" name="tarifa_hora" type="number" min="1" value="${z.tarifa_hora}" style="width:110px;min-height:38px;padding:6px 10px">
          <button class="btn ghost sm" type="submit">Guardar</button></form>
      </div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Cuadra</th><th class="r">Lugares</th><th>Trabajador/a asignado</th></tr></thead>
      <tbody>${lista.filter((c) => c.zona_id === z.id).map((c) => html`<tr>
        <td><span class="badge">${c.codigo}</span></td><td>${cuadraTxt(c)}</td><td class="r num">${c.capacidad}</td>
        <td><select class="input" data-asignar="${c.id}" style="min-height:38px;padding:6px 10px">
          <option value="">— Sin asignar —</option>
          ${activos.map((t) => html`<option value="${t.id}" ${t.id === c.trabajador_id ? 'selected' : ''}>${t.nombre} (${t.cooperativa})</option>`)}
        </select></td></tr>`)}</tbody></table></div>
    </section>`)}
  `);
  $$('[data-tarifa]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => { await patch(`/admin/zonas/${f.dataset.tarifa}`, datosForm(f)); toast('Tarifa actualizada. Rige para los nuevos estacionamientos.'); });
  }));
  $$('[data-asignar]').forEach((s) => s.addEventListener('change', () =>
    accion(s, async () => { await put(`/admin/cuadras/${s.dataset.asignar}/trabajador`, { trabajador_id: s.value || null }); toast('Asignación guardada.'); })));
}

export async function actas(ctx) {
  const estado = ctx.query.get('estado') || 'pendiente';
  const lista = await get(`/admin/actas${estado === 'todas' ? '' : `?estado=${estado}`}`);
  const ESTADO = { pendiente: 'warn', validada: 'ok', anulada: '' };
  pagina(ctx, html`
    <h1>Actas</h1>
    <div class="segmented" style="margin-bottom:14px">${['pendiente', 'validada', 'anulada', 'todas'].map((e) =>
      html`<button data-filtro="${e}" aria-pressed="${e === estado}">${e[0].toUpperCase() + e.slice(1)}${e === 'todas' ? '' : 's'}</button>`)}</div>
    <div class="card list">${lista.length ? lista.map((a) => html`<div class="list-item" style="flex-wrap:wrap">
      ${patente(a.patente)}
      <span class="grow"><span class="title">${a.motivo}</span><br>
        <span class="small muted">${cuadraTxt(a)} · ${a.trabajador} · ${fechaHora(a.fecha)}</span>
        ${a.observacion ? html`<br><span class="small">“${a.observacion}”</span>` : ''}</span>
      ${a.estado === 'pendiente'
        ? html`<span class="row"><button class="btn ghost sm" data-estado="anulada" data-id="${a.id}">Anular</button><button class="btn primary sm" data-estado="validada" data-id="${a.id}">Validar</button></span>`
        : html`<span class="badge ${ESTADO[a.estado]}">${a.estado}</span>`}
    </div>`) : vacio('No hay actas en esta categoría.')}</div>
    <p class="small muted" style="margin-top:12px">Las actas validadas se envían a la autoridad municipal de tránsito. La integración con el sistema municipal queda para una próxima etapa.</p>
  `);
  $$('[data-filtro]').forEach((b) => b.addEventListener('click', () => ctx.ir(`a/actas?estado=${b.dataset.filtro}`)));
  $$('[data-estado]').forEach((b) => b.addEventListener('click', () =>
    accion(b, async () => { await patch(`/admin/actas/${b.dataset.id}`, { estado: b.dataset.estado }); toast(`Acta ${b.dataset.estado}.`); ctx.recargar(); })));
}

export async function config(ctx) {
  const p = await get('/parametros');
  const DIST = [
    ['dist_trabajadores', 'Trabajadores/as cooperativistas'],
    ['dist_municipio', 'Municipalidad (canon)'],
    ['dist_fondo_solidario', 'Fondo solidario y capacitación'],
    ['dist_tecnologia', 'Mantenimiento tecnológico'],
  ];
  pagina(ctx, html`
    <h1>Configuración</h1>
    <form class="stack" id="form" style="max-width:640px">
      <section class="card stack"><h2 style="margin:0">Reglas de cobro</h2>
        <div class="grid-2">
          <label class="field">Tiempo mínimo (min)<input class="input num" name="minimo_minutos" type="number" min="0" max="240" value="${p.minimo_minutos}"></label>
          <label class="field">Fracción (min)<input class="input num" name="fraccion_minutos" type="number" min="1" max="60" value="${p.fraccion_minutos}"></label>
        </div>
        <label class="field">Saldo mínimo para estacionar por app ($)<input class="input num" name="saldo_minimo_inicio" type="number" min="0" value="${p.saldo_minimo_inicio}"></label>
        <label class="field">Horario de cobro (texto informativo)<input class="input" name="horario" value="${p.horario}"></label>
      </section>
      <section class="card stack"><h2 style="margin:0">Distribución de lo recaudado</h2>
        <p class="small muted" style="margin:0">Se publica en el portal de transparencia. Los porcentajes deben sumar 100.</p>
        ${DIST.map(([k, n], i) => html`<label class="row between"><span><span class="dot" style="background:${SERIES[i]}"></span> ${n}</span>
          <input class="input num" name="${k}" type="number" min="0" max="100" value="${p[k]}" style="width:100px" data-dist></label>`)}
        <div class="row between"><strong>Total</strong><strong class="num" id="suma"></strong></div>
      </section>
      <button class="btn primary lg" type="submit">Guardar cambios</button>
    </form>
  `);
  const suma = () => {
    const s = $$('[data-dist]').reduce((t, i) => t + (Number(i.value) || 0), 0);
    $('#suma').textContent = `${s}%`;
    $('#suma').style.color = s === 100 ? 'var(--ok)' : 'var(--danger)';
  };
  $$('[data-dist]').forEach((i) => i.addEventListener('input', suma));
  suma();
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => {
      const datos = datosForm(e.target);
      const nuevos = await patch('/admin/parametros', datos);
      Object.assign(ctx.params, nuevos);
      toast('Configuración guardada.');
    });
  });
}
