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
      ${e.trabajador ? html`<div class="list-item">${icono('corazon')}<span class="grow small">Te atiende <strong>${e.trabajador}</strong> <span style="white-space:nowrap">(ID ${e.trabajador_legajo})</span>, trabajador/a cooperativista.</span></div>` : ''}
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
  const r = await get('/conductor/resumen');
  if (r.activos.length) {
    toast('Ya tenés un estacionamiento en curso.');
    return ctx.ir('c');
  }
  const sel = { vehiculo: r.vehiculos[0]?.id ?? null, trabajador: null, cuadra: null };

  pagina(ctx, html`
    <h1>Estacionar</h1>
    <div class="section"><h2>1. ¿Qué vehículo?</h2><a class="small" href="#/c/vehiculos">Agregar</a></div>
    ${r.vehiculos.length
      ? html`<div class="choice-grid" id="vehiculos">${r.vehiculos.map((v) => html`<button class="choice" data-v="${v.id}" aria-pressed="${v.id === sel.vehiculo}">
          ${patente(v.patente)}<span class="small muted">${v.alias || ''}</span></button>`)}</div>`
      : html`<a class="btn primary block" href="#/c/vehiculos">${icono('mas')} Agregar mi primer vehículo</a>`}

    <div class="section"><h2>2. ¿Quién te atiende?</h2></div>
    <form class="card stack" id="buscar-trabajador">
      <label class="field">ID del trabajador/a
        <input class="input plate-input" id="id-trabajador" name="id" placeholder="APK-100" maxlength="12" autocomplete="off" autocapitalize="characters" required>
        <span class="hint">Pedíselo al trabajador/a de la cuadra: figura en su credencial.</span></label>
      <button class="btn ghost block" type="submit">${icono('buscar')} Buscar</button>
      <div id="trabajador"></div>
    </form>

    <div class="section"><h2>3. Confirmá</h2></div>
    <div class="card stack" id="resumen"></div>
  `);

  const pintarTrabajador = () => {
    const t = sel.trabajador;
    if (!t) return montar($('#trabajador'), '');
    montar($('#trabajador'), html`<div class="stack">
      <div class="row" style="gap:12px">
        <span style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);flex:none">${icono('usuario')}</span>
        <span class="grow"><strong>${t.nombre}</strong><br><span class="small muted">${t.cooperativa} · <span style="white-space:nowrap">ID ${t.legajo}</span></span></span>
        ${t.en_jornada ? html`<span class="badge ok">En jornada</span>` : html`<span class="badge warn">Fuera de turno</span>`}
      </div>
      ${t.cuadras.length > 1 ? html`<span class="small muted">¿En cuál de sus cuadras estacionaste?</span>` : ''}
      <div class="list">${t.cuadras.map((c) => {
        const pct = Math.min(100, Math.round((c.ocupados / c.capacidad) * 100));
        return html`<button type="button" class="pick-row" data-c="${c.id}" aria-pressed="${c.id === sel.cuadra}">
          <span class="grow"><span class="title">${cuadraTxt(c)}</span> <span class="badge">${c.codigo}</span><br>
          <span class="small muted"><span class="dot" style="background:${c.zona_color};width:8px;height:8px"></span> ${c.zona} · ${pesos(c.tarifa_hora)}/h</span>
          <span class="meter ${pct > 90 ? 'full' : pct > 70 ? 'warn' : ''}" style="margin-top:6px"><span style="width:${pct}%"></span></span></span>
          <span class="small muted num">${Math.max(0, c.capacidad - c.ocupados)} libres</span></button>`;
      })}</div>
      ${t.cuadras.length ? '' : html`<p class="small" style="margin:0;color:var(--danger)">Este trabajador/a no tiene cuadras asignadas.</p>`}
    </div>`);
    $$('[data-c]').forEach((b) => b.addEventListener('click', () => {
      sel.cuadra = Number(b.dataset.c);
      pintarTrabajador();
      pintarResumen();
    }));
  };

  const pintarResumen = () => {
    const t = sel.trabajador;
    const c = t?.cuadras.find((x) => x.id === sel.cuadra);
    const v = r.vehiculos.find((x) => x.id === sel.vehiculo);
    const minimo = c ? calcularMonto(0, c.tarifa_hora, ctx.params) : 0;
    montar($('#resumen'), html`
      <div class="list">
        <div class="list-item"><span class="grow muted">Vehículo</span>${v ? patente(v.patente) : html`<span class="muted">—</span>`}</div>
        <div class="list-item"><span class="grow muted">Te atiende</span><strong>${t ? `${t.nombre} (${t.legajo})` : '—'}</strong></div>
        <div class="list-item"><span class="grow muted">Cuadra</span><strong>${c ? cuadraTxt(c) : '—'}</strong></div>
        <div class="list-item"><span class="grow muted">Tarifa</span><strong class="num">${c ? `${pesos(c.tarifa_hora)} por hora` : '—'}</strong></div>
        <div class="list-item"><span class="grow muted">Tu saldo</span><strong class="num">${pesos(r.saldo)}</strong></div>
      </div>
      <p class="small muted" style="margin:0">Se cobra un mínimo de ${ctx.params.minimo_minutos} min${c ? ` (${pesos(minimo)})` : ''} y después por fracción de ${ctx.params.fraccion_minutos} min. Pagás recién cuando finalizás.</p>
      <button class="btn primary block lg" id="confirmar" ${!v || !c ? 'disabled' : ''}>Comenzar estacionamiento</button>`);
    $('#confirmar').addEventListener('click', (e) => accion(e.currentTarget, async () => {
      await post('/conductor/estacionar', { vehiculo_id: sel.vehiculo, trabajador_id: t.legajo, cuadra_id: sel.cuadra });
      toast(`¡Listo! Tu estacionamiento con ${t.nombre} está en curso.`);
      ctx.ir('c');
    }));
  };

  const buscarTrabajador = (id, boton) => accion(boton, async () => {
    sel.trabajador = null;
    sel.cuadra = null;
    try {
      const t = await get(`/conductor/trabajador/${encodeURIComponent(id)}`);
      sel.trabajador = t;
      // Preselecciona la cuadra de su jornada en curso, o la única que tenga.
      sel.cuadra = t.cuadras.find((c) => c.id === t.cuadra_jornada_id)?.id ?? (t.cuadras.length === 1 ? t.cuadras[0].id : null);
    } finally {
      pintarTrabajador();
      pintarResumen();
    }
  });

  $$('[data-v]').forEach((b) => b.addEventListener('click', () => {
    sel.vehiculo = Number(b.dataset.v);
    $$('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarResumen();
  }));
  // Busca solo cuando el ID tiene la forma esperada (3 letras y 3 números), sin esperar al botón.
  let espera;
  $('#buscar-trabajador').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(espera);
    buscarTrabajador($('#id-trabajador').value, e.submitter);
  });
  $('#id-trabajador').addEventListener('input', (e) => {
    clearTimeout(espera);
    const valor = e.target.value;
    if (/^[A-Za-z]{3}[\s-]?\d{3}$/.test(valor.trim())) espera = setTimeout(() => buscarTrabajador(valor), 350);
  });
  ctx.alSalir(() => clearTimeout(espera));
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
