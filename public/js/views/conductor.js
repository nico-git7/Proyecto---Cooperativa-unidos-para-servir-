import { del, get, post } from '../api.js';
import { icono } from '../icons.js';
import { barraSuperior, navInferior } from '../layout.js';
import { calcularMonto, minutosEntre } from '../reglas.js';
import {
  $, $$, accion, confirmar, cronometro, cuadraTxt, datosForm, duracion, fecha, fechaHora, hora, html, montar, patente, pesos, toast, vacio,
} from '../ui.js';

const NAV = [
  { ruta: 'c', texto: 'Inicio', icono: 'inicio' },
  { ruta: 'c/estacionar', texto: 'Estacionar', icono: 'estacionar' },
  { ruta: 'c/saldo', texto: 'Saldo', icono: 'billetera' },
  { ruta: 'c/historial', texto: 'Historial', icono: 'historial' },
];

function pagina(ctx, contenido) {
  montar(ctx.root, html`<div class="app-shell">
    ${barraSuperior(ctx.usuario, `Hola, ${ctx.usuario.nombre.split(' ')[0]}`)}
    ${contenido}
  </div>${navInferior(NAV, ctx.ruta)}`);
}

const filaEstacionamiento = (e) => html`<div class="list-item">
  ${patente(e.patente)}
  <span class="grow"><span class="title ellipsis">${cuadraTxt(e)}</span><br>
  <span class="small muted">${fecha(e.inicio)} · ${hora(e.inicio)}–${e.fin ? hora(e.fin) : 'en curso'} · ${duracion(e.minutos ?? e.minutos_transcurridos ?? 0)}</span></span>
  <strong class="num">${e.monto != null ? pesos(e.monto) : html`<span class="badge ok">En curso</span>`}</strong></div>`;

function tarjetaActivo(e) {
  return html`<article class="card stack accent" data-activo="${e.id}" data-inicio="${e.inicio}" data-tarifa="${e.tarifa_hora}">
    <div class="row between"><span class="badge ok"><span class="dot pulse" style="background:currentColor;width:8px;height:8px"></span> Estacionado</span>
      ${patente(e.patente)}</div>
    <div class="center">
      <div class="timer" data-timer>${cronometro(e.inicio)}</div>
      <div class="muted">Llevás <strong class="num" data-monto>${pesos(e.monto_actual)}</strong> · desde las ${hora(e.inicio)}</div>
    </div>
    <div class="list">
      <div class="list-item">${icono('pin')}<span class="grow"><span class="title">${cuadraTxt(e)}</span><br>
        <span class="small muted"><span class="dot" style="background:${e.zona_color};width:8px;height:8px"></span> ${e.zona} · ${pesos(e.tarifa_hora)}/h</span></span></div>
      ${e.trabajador ? html`<div class="list-item">${icono('corazon')}<span class="grow small">Tu cuadra la cuida <strong>${e.trabajador}</strong>, trabajador/a cooperativista.</span></div>` : ''}
    </div>
    <button class="btn primary block lg" data-finalizar="${e.id}">Finalizar y pagar</button>
  </article>`;
}

export async function inicio(ctx) {
  const r = await get('/conductor/resumen');
  pagina(ctx, html`
    <div class="card hero stack">
      <div class="row between">
        <div class="kpi"><span class="label">Tu saldo</span><span class="saldo" style="color:inherit">${pesos(r.saldo)}</span></div>
        <a class="btn on-hero sm" href="#/c/saldo">${icono('mas')} Cargar</a>
      </div>
    </div>
    ${r.activos.length
      ? html`<div class="section"><h2>Estacionamiento en curso</h2></div><div class="stack">${r.activos.map(tarjetaActivo)}</div>`
      : html`<a class="btn accent block lg" style="margin-top:14px" href="#/c/estacionar">${icono('estacionar')} Estacionar ahora</a>`}
    <div class="section"><h2>Mis vehículos</h2><a class="small" href="#/c/vehiculos">Administrar</a></div>
    <div class="card list">${r.vehiculos.length
      ? r.vehiculos.map((v) => html`<div class="list-item">${patente(v.patente)}<span class="grow muted">${v.alias || ''}</span></div>`)
      : vacio('Todavía no agregaste vehículos.')}</div>
    <div class="section"><h2>Últimos estacionamientos</h2><a class="small" href="#/c/historial">Ver todo</a></div>
    <div class="card list">${r.ultimos.length ? r.ultimos.map(filaEstacionamiento) : vacio('Acá vas a ver tus estacionamientos.')}</div>
    <p class="small muted center" style="margin-top:16px">Horario de cobro: ${ctx.params.horario}</p>
  `);

  // Cronómetro y monto en vivo, con la misma regla de cobro que el servidor.
  const tic = () => $$('[data-activo]').forEach((card) => {
    $('[data-timer]', card).textContent = cronometro(card.dataset.inicio);
    $('[data-monto]', card).textContent = pesos(calcularMonto(minutosEntre(card.dataset.inicio), Number(card.dataset.tarifa), ctx.params));
  });
  const intervalo = setInterval(tic, 1000);
  ctx.alSalir(() => clearInterval(intervalo));

  $$('[data-finalizar]').forEach((b) => b.addEventListener('click', async () => {
    const card = b.closest('[data-activo]');
    const monto = calcularMonto(minutosEntre(card.dataset.inicio), Number(card.dataset.tarifa), ctx.params);
    if (!(await confirmar('¿Finalizar estacionamiento?', `Se van a descontar ${pesos(monto)} de tu saldo.`, { ok: 'Finalizar y pagar' }))) return;
    accion(b, async () => {
      const res = await post(`/conductor/estacionamientos/${b.dataset.finalizar}/finalizar`);
      toast(`Listo. Pagaste ${pesos(res.estacionamiento.monto)}. ¡Gracias por elegir el estacionamiento solidario!`);
      ctx.recargar();
    });
  }));
}

export async function estacionar(ctx) {
  const [r, zonas] = await Promise.all([get('/conductor/resumen'), get('/zonas')]);
  if (r.activos.length) {
    toast('Ya tenés un estacionamiento en curso.');
    return ctx.ir('c');
  }
  const sel = { vehiculo: r.vehiculos[0]?.id ?? null, cuadra: null, zona: zonas[0]?.id };
  const todas = zonas.flatMap((z) => z.cuadras.map((c) => ({ ...c, zona: z })));

  pagina(ctx, html`
    <h1>Estacionar</h1>
    <div class="section"><h2>1. ¿Qué vehículo?</h2><a class="small" href="#/c/vehiculos">Agregar</a></div>
    ${r.vehiculos.length
      ? html`<div class="choice-grid" id="vehiculos">${r.vehiculos.map((v) => html`<button class="choice" data-v="${v.id}" aria-pressed="${v.id === sel.vehiculo}">
          ${patente(v.patente)}<span class="small muted">${v.alias || ''}</span></button>`)}</div>`
      : html`<a class="btn primary block" href="#/c/vehiculos">${icono('mas')} Agregar mi primer vehículo</a>`}

    <div class="section"><h2>2. ¿Dónde estacionaste?</h2></div>
    <div class="card stack">
      <label class="field">Código de cuadra
        <input class="input plate-input" id="codigo" placeholder="SM500" maxlength="8" autocomplete="off">
        <span class="hint">Lo encontrás en el cartel de la cuadra o te lo dice tu trabajador/a.</span></label>
      <div class="divider">o buscala en la lista</div>
      <div class="segmented" id="zonas">${zonas.map((z) => html`<button data-z="${z.id}" aria-pressed="${z.id === sel.zona}">${z.nombre}</button>`)}</div>
      <div class="list" id="cuadras"></div>
    </div>

    <div class="section"><h2>3. Confirmá</h2></div>
    <div class="card stack" id="resumen"></div>
  `);

  const pintarCuadras = () => {
    const z = zonas.find((x) => x.id === sel.zona);
    montar($('#cuadras'), z.cuadras.map((c) => {
      const pct = Math.min(100, Math.round((c.ocupados / c.capacidad) * 100));
      return html`<button class="pick-row" data-c="${c.id}" aria-pressed="${c.id === sel.cuadra}">
        <span class="grow"><span class="title">${cuadraTxt(c)}</span> <span class="badge">${c.codigo}</span><br>
        <span class="small muted">${c.trabajador ? `Cuida: ${c.trabajador}` : 'Sin trabajador/a asignado'}</span>
        <span class="meter ${pct > 90 ? 'full' : pct > 70 ? 'warn' : ''}" style="margin-top:6px"><span style="width:${pct}%"></span></span></span>
        <span class="small muted num">${c.capacidad - c.ocupados} libres</span></button>`;
    }));
    $$('[data-c]').forEach((b) => b.addEventListener('click', () => {
      sel.cuadra = Number(b.dataset.c);
      $('#codigo').value = todas.find((c) => c.id === sel.cuadra).codigo;
      pintarCuadras();
      pintarResumen();
    }));
  };

  const pintarResumen = () => {
    const c = todas.find((x) => x.id === sel.cuadra);
    const v = r.vehiculos.find((x) => x.id === sel.vehiculo);
    const minimo = c ? calcularMonto(0, c.zona.tarifa_hora, ctx.params) : 0;
    montar($('#resumen'), html`
      <div class="list">
        <div class="list-item"><span class="grow muted">Vehículo</span>${v ? patente(v.patente) : html`<span class="muted">—</span>`}</div>
        <div class="list-item"><span class="grow muted">Cuadra</span><strong>${c ? cuadraTxt(c) : '—'}</strong></div>
        <div class="list-item"><span class="grow muted">Tarifa</span><strong class="num">${c ? `${pesos(c.zona.tarifa_hora)} por hora` : '—'}</strong></div>
        <div class="list-item"><span class="grow muted">Tu saldo</span><strong class="num">${pesos(r.saldo)}</strong></div>
      </div>
      <p class="small muted" style="margin:0">Se cobra un mínimo de ${ctx.params.minimo_minutos} min${c ? ` (${pesos(minimo)})` : ''} y después por fracción de ${ctx.params.fraccion_minutos} min. Pagás recién cuando finalizás.</p>
      <button class="btn primary block lg" id="confirmar" ${!v || !c ? 'disabled' : ''}>Comenzar estacionamiento</button>`);
    $('#confirmar').addEventListener('click', (e) => accion(e.currentTarget, async () => {
      await post('/conductor/estacionar', { vehiculo_id: sel.vehiculo, cuadra_id: sel.cuadra });
      toast('¡Listo! Tu estacionamiento está en curso.');
      ctx.ir('c');
    }));
  };

  $$('[data-v]').forEach((b) => b.addEventListener('click', () => {
    sel.vehiculo = Number(b.dataset.v);
    $$('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarResumen();
  }));
  $$('[data-z]').forEach((b) => b.addEventListener('click', () => {
    sel.zona = Number(b.dataset.z);
    $$('[data-z]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarCuadras();
  }));
  $('#codigo').addEventListener('input', (e) => {
    const c = todas.find((x) => x.codigo === e.target.value.trim().toUpperCase());
    sel.cuadra = c?.id ?? null;
    if (c) {
      sel.zona = c.zona.id;
      $$('[data-z]').forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset.z) === sel.zona)));
    }
    pintarCuadras();
    pintarResumen();
  });
  pintarCuadras();
  pintarResumen();
}

export async function vehiculos(ctx) {
  const r = await get('/conductor/resumen');
  pagina(ctx, html`
    <h1>Mis vehículos</h1>
    <div class="card list" id="lista">${r.vehiculos.length
      ? r.vehiculos.map((v) => html`<div class="list-item">${patente(v.patente)}<span class="grow muted">${v.alias || ''}</span>
          <button class="icon-btn" data-borrar="${v.id}" aria-label="Quitar ${v.patente}">${icono('basura')}</button></div>`)
      : vacio('Todavía no agregaste vehículos.')}</div>
    <div class="section"><h2>Agregar vehículo</h2></div>
    <form class="card stack" id="nuevo">
      <label class="field">Patente<input class="input plate-input" name="patente" placeholder="AB123CD" maxlength="9" required autocomplete="off"></label>
      <label class="field">Nombre (opcional)<input class="input" name="alias" placeholder="Ej.: Auto del trabajo" maxlength="40"></label>
      <button class="btn primary block" type="submit">${icono('mas')} Agregar</button>
    </form>
  `);
  $('#nuevo').addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => {
      await post('/conductor/vehiculos', datosForm(e.target));
      toast('Vehículo agregado.');
      ctx.recargar();
    });
  });
  $$('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar('¿Quitar vehículo?', 'Podés volver a agregarlo cuando quieras.', { ok: 'Quitar', peligro: true }))) return;
    accion(b, async () => { await del(`/conductor/vehiculos/${b.dataset.borrar}`); ctx.recargar(); });
  }));
}

export async function saldo(ctx) {
  const [r, h] = await Promise.all([get('/conductor/resumen'), get('/conductor/historial')]);
  const sel = { monto: 2000, medio: 'billetera' };
  pagina(ctx, html`
    <div class="card hero"><div class="kpi"><span class="label">Saldo disponible</span><span class="saldo">${pesos(r.saldo)}</span></div></div>
    <div class="section"><h2>Cargar saldo</h2></div>
    <div class="card stack">
      <div class="choice-grid" id="montos">${[1000, 2000, 5000, 10000].map((m) => html`<button class="choice center" data-m="${m}" aria-pressed="${m === sel.monto}"><strong class="num">${pesos(m)}</strong></button>`)}</div>
      <label class="field">Otro monto<input class="input num" id="otro" type="number" min="500" max="100000" step="100" placeholder="$"></label>
      <label class="field">Medio de pago
        <select class="input" id="medio">
          <option value="billetera">Billetera virtual / QR</option>
          <option value="tarjeta">Tarjeta de débito o crédito</option>
          <option value="transferencia">Transferencia</option>
        </select></label>
      <button class="btn primary block lg" id="cargar">Cargar ${pesos(sel.monto)}</button>
      <p class="small muted" style="margin:0">⚠️ Prototipo: el pago es simulado. En producción se integra una pasarela de pago local.</p>
    </div>
    <div class="card flat small" style="margin-top:12px">${icono('efectivo')} ¿Preferís efectivo? Pagale directamente al trabajador/a de tu cuadra: queda registrado igual.</div>
    <div class="section"><h2>Movimientos</h2></div>
    <div class="card list">${h.movimientos.length ? h.movimientos.map((m) => html`<div class="list-item">
      <span class="grow"><span class="title">${m.detalle}</span><br><span class="small muted">${fechaHora(m.fecha)}</span></span>
      <strong class="num" style="color:${m.monto > 0 ? 'var(--ok)' : 'inherit'}">${m.monto > 0 ? '+' : ''}${pesos(m.monto)}</strong></div>`) : vacio('Sin movimientos todavía.')}</div>
  `);
  const actualizarBoton = () => { $('#cargar').textContent = `Cargar ${pesos(sel.monto)}`; };
  $$('[data-m]').forEach((b) => b.addEventListener('click', () => {
    sel.monto = Number(b.dataset.m);
    $('#otro').value = '';
    $$('[data-m]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    actualizarBoton();
  }));
  $('#otro').addEventListener('input', (e) => {
    sel.monto = Number(e.target.value) || 0;
    $$('[data-m]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    actualizarBoton();
  });
  $('#cargar').addEventListener('click', (e) => accion(e.currentTarget, async () => {
    const res = await post('/conductor/saldo', { monto: sel.monto, medio: $('#medio').value });
    toast(`Carga acreditada. Nuevo saldo: ${pesos(res.saldo)}`);
    ctx.recargar();
  }));
}

export async function historial(ctx) {
  const h = await get('/conductor/historial');
  const total = h.estacionamientos.reduce((s, e) => s + (e.monto || 0), 0);
  pagina(ctx, html`
    <h1>Historial</h1>
    <div class="grid-2">
      <div class="card kpi"><span class="label">Estacionamientos</span><span class="value">${h.estacionamientos.length}</span></div>
      <div class="card kpi"><span class="label">Total pagado</span><span class="value">${pesos(total)}</span></div>
    </div>
    <div class="section"><h2>Estacionamientos</h2></div>
    <div class="card list">${h.estacionamientos.length ? h.estacionamientos.map(filaEstacionamiento) : vacio('Todavía no estacionaste.')}</div>
    <p class="small muted center" style="margin-top:12px">${icono('corazon')} El ${ctx.params.dist_trabajadores}% de lo que pagás va a los trabajadores/as cooperativistas. <a href="#/transparencia">Ver transparencia</a></p>
  `);
}
