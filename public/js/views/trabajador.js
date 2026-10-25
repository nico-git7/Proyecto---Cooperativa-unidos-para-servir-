import { get, post } from '../api.js';
import { icono } from '../icons.js';
import { barraSuperior, navInferior } from '../layout.js';
import { calcularMonto, minutosEntre, normalizarPatente } from '../reglas.js';
import {
  $, $$, accion, confirmar, cuadraTxt, datosForm, duracion, fechaHora, hora, html, modal, montar, patente, pesos, toast, vacio,
} from '../ui.js';

const NAV = [
  { ruta: 't', texto: 'Inicio', icono: 'inicio' },
  { ruta: 't/consultar', texto: 'Consultar', icono: 'buscar' },
  { ruta: 't/registrar', texto: 'Efectivo', icono: 'efectivo' },
  { ruta: 't/acta', texto: 'Acta', icono: 'acta' },
];

function pagina(ctx, contenido) {
  const u = ctx.usuario;
  montar(ctx.root, html`<div class="app-shell">
    ${barraSuperior(u, `${u.nombre} · ${u.cooperativa}`)}
    ${contenido}
  </div>${navInferior(NAV, ctx.ruta)}`);
}

const opcionesCuadras = (cuadras, elegida) =>
  cuadras.map((c) => html`<option value="${c.id}" ${c.id === elegida ? 'selected' : ''}>${cuadraTxt(c)} (${c.codigo})</option>`);

export async function inicio(ctx) {
  const r = await get('/trabajador/resumen');
  const enCurso = r.activos;
  pagina(ctx, html`
    ${r.jornada
      ? html`<div class="card hero stack">
          <div class="row between"><span class="badge" style="background:var(--primary-ink);color:var(--primary)"><span class="dot pulse" style="background:currentColor;width:8px;height:8px"></span> En jornada</span>
            <span class="small">desde las ${hora(r.jornada.inicio)}</span></div>
          <div><strong style="font-size:1.25rem">${cuadraTxt(r.jornada)}</strong><br><span class="muted small">Código de cuadra: ${r.jornada.codigo}</span></div>
          <button class="btn on-hero block" id="fin-jornada">Finalizar jornada</button></div>`
      : html`<form class="card stack accent" id="ini-jornada">
          <h2>Iniciá tu jornada</h2>
          <p class="muted small" style="margin:0">Registrar tu horario respalda tu trabajo y tus aportes.</p>
          <label class="field">Cuadra<select class="input" name="cuadra_id">${opcionesCuadras(r.cuadras)}</select></label>
          <button class="btn primary block lg" type="submit">${icono('reloj')} Iniciar jornada</button></form>`}

    <div class="grid-2" style="margin-top:12px;grid-template-columns:repeat(3,1fr)">
      <a class="btn block" style="flex-direction:column;min-height:84px" href="#/t/consultar">${icono('buscar')}<span class="small">Consultar</span></a>
      <a class="btn block" style="flex-direction:column;min-height:84px" href="#/t/registrar">${icono('efectivo')}<span class="small">Cobro efectivo</span></a>
      <a class="btn block" style="flex-direction:column;min-height:84px" href="#/t/acta">${icono('acta')}<span class="small">Labrar acta</span></a>
    </div>

    <div class="section"><h2>Mi día</h2></div>
    <div class="grid-2">
      <div class="card kpi"><span class="label">Recaudado hoy</span><span class="value">${pesos(r.hoy.total)}</span><span class="sub">${r.hoy.cantidad} vehículos</span></div>
      <div class="card kpi"><span class="label">Efectivo a rendir</span><span class="value">${pesos(r.efectivo_a_rendir)}</span><span class="sub">App: ${pesos(r.hoy.app)}</span></div>
      <div class="card kpi"><span class="label">Horas trabajadas</span><span class="value">${String(r.hoy.horas).replace('.', ',')} h</span></div>
      <div class="card kpi"><span class="label">Actas hoy</span><span class="value">${r.hoy.actas}</span></div>
    </div>

    <div class="section"><h2>Mis cuadras</h2></div>
    <div class="card list">${r.cuadras.map((c) => {
      const pct = Math.min(100, Math.round((c.ocupados / c.capacidad) * 100));
      return html`<div class="list-item"><span class="grow"><span class="title">${cuadraTxt(c)}</span> <span class="badge">${c.codigo}</span>
        <span class="meter ${pct > 90 ? 'full' : pct > 70 ? 'warn' : ''}" style="margin-top:8px"><span style="width:${pct}%"></span></span></span>
        <span class="small num"><strong>${c.ocupados}</strong>/${c.capacidad}</span></div>`;
    })}</div>

    <div class="section"><h2>Estacionados ahora</h2><span class="badge primary">${enCurso.length}</span></div>
    <div class="card list" id="activos">${enCurso.length ? enCurso.map((e) => html`<div class="list-item" data-inicio="${e.inicio}" data-tarifa="${e.tarifa_hora}">
      ${patente(e.patente)}
      <span class="grow"><span class="small num"><strong data-dur>${duracion(e.minutos_transcurridos)}</strong> · ${hora(e.inicio)}</span><br>
        <span class="badge ${e.medio === 'app' ? 'primary' : 'warn'}">${e.medio === 'app' ? 'App' : 'Efectivo'}</span>
        <span class="small muted">${e.cuadra_codigo}</span></span>
      ${e.medio === 'efectivo' && e.registrado_por === ctx.usuario.id
        ? html`<button class="btn accent cobrar" data-cobrar="${e.id}" data-patente="${e.patente}"><small>Cobrar</small><span class="num" data-monto>${pesos(e.monto_actual)}</span></button>`
        : html`<span class="num small muted" data-monto>${pesos(e.monto_actual)}</span>`}
    </div>`) : vacio('No hay vehículos estacionados en tus cuadras.')}</div>
  `);

  const tic = () => $$('#activos [data-inicio]').forEach((row) => {
    const min = minutosEntre(row.dataset.inicio);
    $('[data-dur]', row).textContent = duracion(min);
    $('[data-monto]', row).textContent = pesos(calcularMonto(min, Number(row.dataset.tarifa), ctx.params));
  });
  const t1 = setInterval(tic, 15000);
  const t2 = setInterval(() => document.visibilityState === 'visible' && !document.querySelector('dialog[open]') && ctx.recargar(), 60000);
  ctx.alSalir(() => { clearInterval(t1); clearInterval(t2); });

  $('#ini-jornada')?.addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => { await post('/trabajador/jornada/iniciar', datosForm(e.target)); toast('¡Buena jornada!'); ctx.recargar(); });
  });
  $('#fin-jornada')?.addEventListener('click', async (e) => {
    if (!(await confirmar('¿Finalizar jornada?', 'Se registra la hora de salida.', { ok: 'Finalizar' }))) return;
    accion(e.target, async () => { await post('/trabajador/jornada/finalizar'); toast('Jornada finalizada. ¡Gracias!'); ctx.recargar(); });
  });
  $$('[data-cobrar]').forEach((b) => b.addEventListener('click', () => cobrar(ctx, b)));
}

async function cobrar(ctx, boton) {
  const row = boton.closest('[data-inicio]');
  const monto = calcularMonto(minutosEntre(row.dataset.inicio), Number(row.dataset.tarifa), ctx.params);
  modal(html`<h2>Cobrar en efectivo</h2>
    <div class="center">${patente(boton.dataset.patente, true)}</div>
    <div class="status ok"><span class="small">Cobrale al conductor/a</span><span class="big num" style="font-size:2.4rem">${pesos(monto)}</span>
      <span class="small">${duracion(minutosEntre(row.dataset.inicio))} desde las ${hora(row.dataset.inicio)}</span></div>
    <p class="small muted" style="margin:0">El monto final se calcula al confirmar. Queda registrado como efectivo a rendir.</p>
    <div class="grid-2"><button class="btn ghost" data-cerrar>Cancelar</button><button class="btn primary" data-ok>Cobrado</button></div>`, (d, cerrar) => {
    $('[data-cerrar]', d).addEventListener('click', cerrar);
    $('[data-ok]', d).addEventListener('click', (e) => accion(e.currentTarget, async () => {
      const fin = await post(`/trabajador/estacionamientos/${boton.dataset.cobrar}/finalizar`);
      cerrar();
      toast(`Registrado: ${pesos(fin.monto)} en efectivo.`);
      ctx.recargar();
    }));
  });
}

export async function consultar(ctx) {
  pagina(ctx, html`
    <h1>Consultar patente</h1>
    <form class="card stack" id="form">
      <label class="field">Patente<input class="input plate-input" name="patente" placeholder="AB123CD" maxlength="9" required autocomplete="off" autofocus></label>
      <button class="btn primary block lg" type="submit">${icono('buscar')} Consultar</button>
    </form>
    <div id="resultado" style="margin-top:14px"></div>
  `);
  const buscar = (p, boton) => accion(boton, async () => {
    const r = await get(`/trabajador/patente/${encodeURIComponent(normalizarPatente(p))}`);
    const e = r.estacionamiento;
    montar($('#resultado'), html`<div class="stack">
      <div class="center">${patente(r.patente, true)}</div>
      ${r.habilitado
        ? html`<div class="status ok">${icono('check')}<span class="big">Estacionamiento registrado</span>
            <span>${cuadraTxt(e)} · ${e.zona}</span><span class="small">Desde las ${hora(e.inicio)} · ${duracion(e.minutos_transcurridos)} · ${e.medio === 'app' ? 'Pago por app' : 'Pago en efectivo'}</span></div>`
        : html`<div class="status bad">${icono('alerta')}<span class="big">Sin estacionamiento registrado</span>
            <span class="small">Ofrecé el cobro en efectivo o invitá a usar la app.</span></div>
            <div class="grid-2"><a class="btn accent" href="#/t/registrar?p=${r.patente}">${icono('efectivo')} Cobro efectivo</a>
            <a class="btn ghost" href="#/t/acta?p=${r.patente}">${icono('acta')} Labrar acta</a></div>`}
      ${r.actas_pendientes ? html`<p class="center small"><span class="badge warn">${r.actas_pendientes} acta(s) pendiente(s) para esta patente</span></p>` : ''}
    </div>`);
  });
  $('#form').addEventListener('submit', (e) => { e.preventDefault(); buscar(e.target.patente.value, e.submitter); });
  if (ctx.query.get('p')) { $('#form').patente.value = ctx.query.get('p'); buscar(ctx.query.get('p')); }
}

export async function registrar(ctx) {
  const r = await get('/trabajador/resumen');
  const elegida = r.jornada?.cuadra_id;
  pagina(ctx, html`
    <h1>Cobro en efectivo</h1>
    <p class="muted">Registrá el ingreso del vehículo. Al retirarse, cobrás desde <a href="#/t">Inicio</a> según el tiempo real.</p>
    <form class="card stack" id="form">
      <label class="field">Patente<input class="input plate-input" name="patente" placeholder="AB123CD" maxlength="9" required autocomplete="off" value="${ctx.query.get('p') || ''}"></label>
      <label class="field">Cuadra<select class="input" name="cuadra_id">${opcionesCuadras(r.cuadras, elegida)}</select></label>
      <div class="small muted" id="tarifa"></div>
      <button class="btn primary block lg" type="submit">${icono('reloj')} Registrar ingreso</button>
    </form>
  `);
  const mostrarTarifa = () => {
    const c = r.cuadras.find((x) => x.id === Number($('#form').cuadra_id.value));
    if (c) $('#tarifa').textContent = `${c.zona}: ${pesos(c.tarifa_hora)}/h · mínimo ${ctx.params.minimo_minutos} min (${pesos(calcularMonto(0, c.tarifa_hora, ctx.params))})`;
  };
  $('#form').cuadra_id.addEventListener('change', mostrarTarifa);
  mostrarTarifa();
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => {
      const est = await post('/trabajador/estacionamientos', datosForm(e.target));
      toast(`${est.patente} registrado a las ${hora(est.inicio)}.`);
      ctx.ir('t');
    });
  });
}

export async function acta(ctx) {
  const [r, actas] = await Promise.all([get('/trabajador/resumen'), get('/trabajador/actas')]);
  const ESTADO = { pendiente: 'warn', validada: 'ok', anulada: '' };
  pagina(ctx, html`
    <h1>Labrar acta</h1>
    <form class="card stack" id="form">
      <label class="field">Patente<input class="input plate-input" name="patente" placeholder="AB123CD" maxlength="9" required autocomplete="off" value="${ctx.query.get('p') || ''}"></label>
      <label class="field">Cuadra<select class="input" name="cuadra_id">${opcionesCuadras(r.cuadras, r.jornada?.cuadra_id)}</select></label>
      <label class="field">Motivo<select class="input" name="motivo">${r.motivos_acta.map((m) => html`<option>${m}</option>`)}</select></label>
      <label class="field">Observación (opcional)<textarea class="input" name="observacion" maxlength="500" placeholder="Ej.: se dejó aviso en el parabrisas"></textarea></label>
      <button class="btn danger block lg" type="submit">${icono('acta')} Labrar acta</button>
      <p class="small muted" style="margin:0">El acta queda pendiente hasta que la administración la valide.</p>
    </form>
    <div class="section"><h2>Mis actas recientes</h2></div>
    <div class="card list">${actas.length ? actas.map((a) => html`<div class="list-item">${patente(a.patente)}
      <span class="grow"><span class="title ellipsis">${a.motivo}</span><br><span class="small muted">${a.cuadra_codigo} · ${fechaHora(a.fecha)}</span></span>
      <span class="badge ${ESTADO[a.estado]}">${a.estado}</span></div>`) : vacio('Todavía no labraste actas.')}</div>
  `);
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => {
      await post('/trabajador/actas', datosForm(e.target));
      toast('Acta registrada.');
      ctx.ir('t/acta');
    });
  });
}
