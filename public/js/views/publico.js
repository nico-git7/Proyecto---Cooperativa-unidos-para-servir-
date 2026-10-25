import { get, post } from '../api.js';
import { icono } from '../icons.js';
import { barraSuperior } from '../layout.js';
import { $, $$, accion, datosForm, html, montar, pesos, pesosCompacto, numero } from '../ui.js';

const DEMOS = [
  { email: 'conductor@demo.com', titulo: 'Conductor/a', texto: 'Estacioná, pagá desde el celular y mirá tu historial.', icono: 'auto' },
  { email: 'trabajador@demo.com', titulo: 'Trabajador/a cooperativista', texto: 'Jornada, consulta de patentes, cobro en efectivo y actas.', icono: 'usuario' },
  { email: 'admin@demo.com', titulo: 'Administración', texto: 'Recaudación, ocupación, trabajadores, tarifas y transparencia.', icono: 'grafico' },
];

const pie = html`<footer class="center small muted" style="margin:28px 0 8px">
  Una propuesta de las Cooperativas de Trabajo <strong>APARKAR LTDA</strong> y <strong>UNIDOS PARA SERVIR</strong><br>
  Tecnología tucumana, trabajo cooperativo · <a href="#/transparencia">Portal de transparencia</a></footer>`;

export async function inicio(ctx) {
  montar(ctx.root, html`<div class="app-shell">
    ${barraSuperior(null)}
    <section class="landing-hero">
      <div class="coops" style="margin-bottom:12px"><span class="badge primary">APARKAR LTDA</span><span class="badge primary">UNIDOS PARA SERVIR</span></div>
      <h1>Estacioná fácil.<br>Apoyá el trabajo cooperativo.</h1>
      <p class="lead">El Estacionamiento Medido Solidario de San Miguel de Tucumán: pagás desde el celular o en efectivo, y cada peso queda registrado.</p>
    </section>

    <form class="card stack" id="login" autocomplete="on">
      <h2>Ingresar</h2>
      <label class="field">Email<input class="input" name="email" type="email" autocomplete="username" required></label>
      <label class="field">Contraseña<input class="input" name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn primary block lg" type="submit">Ingresar</button>
      <p class="center small" style="margin:0">¿No tenés cuenta? <a href="#/registro">Registrate como conductor/a</a></p>
    </form>

    ${ctx.params?.demo !== false ? html`
      <div class="divider" style="margin-top:22px">o probá la demo como</div>
      <div class="role-cards">
        ${DEMOS.map((d) => html`<button class="role-card" data-demo="${d.email}">
          <span class="ico">${icono(d.icono)}</span>
          <span><strong>${d.titulo}</strong><br><span class="small muted">${d.texto}</span></span></button>`)}
      </div>` : ''}
    ${pie}
  </div>`);

  $('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => ctx.iniciarSesion(await post('/auth/login', datosForm(e.target))));
  });
  $$('[data-demo]').forEach((b) =>
    b.addEventListener('click', () => accion(b, async () => ctx.iniciarSesion(await post('/auth/login', { email: b.dataset.demo, password: 'demo1234' })))),
  );
}

export async function registro(ctx) {
  montar(ctx.root, html`<div class="app-shell">
    ${barraSuperior(null)}
    <form class="card stack" id="registro">
      <h1>Crear cuenta</h1>
      <p class="muted">Con tu cuenta podés estacionar y pagar desde el celular.</p>
      <label class="field">Nombre y apellido<input class="input" name="nombre" required autocomplete="name"></label>
      <label class="field">Email<input class="input" name="email" type="email" required autocomplete="email"></label>
      <div class="grid-2">
        <label class="field">Teléfono<input class="input" name="telefono" type="tel" autocomplete="tel"></label>
        <label class="field">DNI<input class="input" name="dni" inputmode="numeric"></label>
      </div>
      <label class="field">Contraseña<input class="input" name="password" type="password" minlength="6" required autocomplete="new-password">
        <span class="hint">Mínimo 6 caracteres.</span></label>
      <button class="btn primary block lg" type="submit">Crear cuenta</button>
      <a class="btn ghost block" href="#/">Volver</a>
    </form>
  </div>`);
  $('#registro').addEventListener('submit', (e) => {
    e.preventDefault();
    accion(e.submitter, async () => ctx.iniciarSesion(await post('/auth/registro', datosForm(e.target))));
  });
}

export async function transparencia(ctx) {
  const [t, zonas] = await Promise.all([get('/transparencia'), get('/zonas')]);
  const colores = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
  const mes = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Tucuman' });
  montar(ctx.root, html`<div class="app-shell">
    ${barraSuperior(ctx.usuario, 'Portal de transparencia')}
    <h1>¿A dónde va lo que pagás?</h1>
    <p class="muted">Datos agregados del sistema en ${mes}. Se actualizan en tiempo real.</p>
    <div class="card hero stack">
      <div class="kpi"><span class="label">Recaudado en el mes</span><span class="value">${pesos(t.recaudado)}</span>
      <span class="sub">${numero(t.estacionamientos)} estacionamientos · ${t.trabajadores} trabajadores/as · ${t.cuadras} cuadras</span></div>
    </div>
    <div class="section"><h2>Distribución propuesta</h2></div>
    <div class="card stack">
      <div class="dist-bar" role="img" aria-label="Distribución de lo recaudado">
        ${t.distribucion.map((d, i) => html`<span style="width:${d.porcentaje}%;background:${colores[i]}"></span>`)}
      </div>
      <div class="list">${t.distribucion.map((d, i) => html`<div class="list-item">
        <span class="dot" style="background:${colores[i]}"></span>
        <span class="grow">${d.nombre}<br><span class="small muted">${d.porcentaje}%</span></span>
        <strong class="num">${pesosCompacto(d.monto)}</strong></div>`)}</div>
    </div>
    <div class="section"><h2>Zonas y tarifas</h2></div>
    <div class="card list">
      ${zonas.map((z) => html`<div class="list-item"><span class="dot" style="background:${z.color}"></span>
        <span class="grow"><span class="title">${z.nombre}</span><br><span class="small muted">${z.descripcion} · ${z.cuadras.length} cuadras</span></span>
        <strong class="num">${pesos(z.tarifa_hora)}/h</strong></div>`)}
    </div>
    <p class="small muted" style="margin-top:12px">Horario de cobro: ${ctx.params.horario}. Mínimo ${ctx.params.minimo_minutos} min, luego por fracción de ${ctx.params.fraccion_minutos} min.</p>
    <a class="btn ghost block" href="#/">Volver</a>
    ${pie}
  </div>`);
}
