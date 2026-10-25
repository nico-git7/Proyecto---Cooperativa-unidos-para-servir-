import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { abrirDB } from '../server/db.js';
import { crearApp } from '../server/index.js';
import { sembrar, PASSWORD_DEMO } from '../server/seed.js';

let server, base;

before(async () => {
  const db = abrirDB(':memory:');
  sembrar(db);
  server = crearApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

async function llamar(ruta, { token, method = 'GET', body } = {}) {
  const res = await fetch(base + ruta, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
const login = async (email) => (await llamar('/auth/login', { method: 'POST', body: { email, password: PASSWORD_DEMO } })).data.token;

test('login inválido', async () => {
  const r = await llamar('/auth/login', { method: 'POST', body: { email: 'conductor@demo.com', password: 'mal' } });
  assert.equal(r.status, 401);
});

test('flujo completo del conductor: estacionar, consultar y pagar', async () => {
  const tc = await login('conductor@demo.com');
  const tt = await login('trabajador@demo.com');
  const resumen = (await llamar('/conductor/resumen', { token: tc })).data;
  const vehiculo = resumen.vehiculos[0];

  const libre = await llamar(`/trabajador/patente/${vehiculo.patente}`, { token: tt });
  assert.equal(libre.data.habilitado, false);

  // El ID se acepta sin guion ni mayúsculas; Ramón Díaz está en jornada en SM500.
  const t = await llamar('/conductor/trabajador/apk%20100', { token: tc });
  assert.equal(t.status, 200);
  assert.equal(t.data.nombre, 'Ramón Díaz');
  assert.deepEqual(t.data.cuadras.map((c) => c.codigo), ['SM500', 'SM600']);

  const est = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: vehiculo.id, trabajador_id: 'APK-100' } });
  assert.equal(est.status, 201);
  assert.equal(est.data.estado, 'activo');
  assert.equal(est.data.cuadra_codigo, 'SM500');
  assert.equal(est.data.trabajador, 'Ramón Díaz');

  const doble = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: vehiculo.id, trabajador_id: 'APK-100' } });
  assert.equal(doble.status, 409);

  const enMiLista = (await llamar('/trabajador/resumen', { token: tt })).data.activos.some((e) => e.id === est.data.id);
  assert.ok(enMiLista, 'el estacionamiento aparece en la lista del trabajador/a');

  const ok = await llamar(`/trabajador/patente/${vehiculo.patente}`, { token: tt });
  assert.equal(ok.data.habilitado, true);

  const fin = await llamar(`/conductor/estacionamientos/${est.data.id}/finalizar`, { token: tc, method: 'POST' });
  assert.equal(fin.status, 200);
  assert.equal(fin.data.estacionamiento.monto, 500); // mínimo 30 min a $1000/h
  assert.equal(fin.data.saldo, resumen.saldo - 500);
});

test('el trabajador/a registra y cobra en efectivo solo en sus cuadras', async () => {
  const tt = await login('trabajador@demo.com');
  const { cuadras } = (await llamar('/trabajador/resumen', { token: tt })).data;
  const ajena = await llamar('/trabajador/estacionamientos', { token: tt, method: 'POST', body: { patente: 'AA999ZZ', cuadra_id: 99 } });
  assert.equal(ajena.status, 403);
  const e = await llamar('/trabajador/estacionamientos', { token: tt, method: 'POST', body: { patente: 'aa 999 zz', cuadra_id: cuadras[0].id } });
  assert.equal(e.status, 201);
  assert.equal(e.data.patente, 'AA999ZZ');
  const antes = (await llamar('/trabajador/resumen', { token: tt })).data.efectivo_a_rendir;
  const fin = await llamar(`/trabajador/estacionamientos/${e.data.id}/finalizar`, { token: tt, method: 'POST' });
  const despues = (await llamar('/trabajador/resumen', { token: tt })).data.efectivo_a_rendir;
  assert.equal(despues - antes, fin.data.monto);
});

test('estacionar exige un ID de trabajador/a válido y una cuadra suya', async () => {
  const tc = await login('conductor@demo.com');
  const { vehiculos } = (await llamar('/conductor/resumen', { token: tc })).data;
  const v = vehiculos[1];
  const sinId = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: v.id } });
  assert.equal(sinId.status, 400);
  const inexistente = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: v.id, trabajador_id: 'XYZ-999' } });
  assert.equal(inexistente.status, 404);
  const cuadraAjena = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: v.id, trabajador_id: 'UPS-101', cuadra_id: 1 } });
  assert.equal(cuadraAjena.status, 400);
  // Silvia Juárez (UPS-103) tiene dos cuadras: fuera de su jornada hay que elegir una.
  await llamar('/trabajador/jornada/finalizar', { token: await login('silvia@demo.com'), method: 'POST' });
  const ambigua = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: v.id, trabajador_id: 'UPS-103' } });
  assert.equal(ambigua.status, 400);
  const silvia = (await llamar('/conductor/trabajador/UPS-103', { token: tc })).data;
  assert.equal(silvia.en_jornada, false);
  const ok = await llamar('/conductor/estacionar', { token: tc, method: 'POST', body: { vehiculo_id: v.id, trabajador_id: 'ups103', cuadra_id: silvia.cuadras[1].id } });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.cuadra_codigo, silvia.cuadras[1].codigo);
});

test('roles protegidos', async () => {
  const tc = await login('conductor@demo.com');
  assert.equal((await llamar('/admin/dashboard', { token: tc })).status, 403);
  assert.equal((await llamar('/admin/dashboard')).status, 401);
  const ta = await login('admin@demo.com');
  const d = await llamar('/admin/dashboard', { token: ta });
  assert.equal(d.status, 200);
  assert.equal(d.data.ultimos_7_dias.length, 7);
  const malo = await llamar('/admin/parametros', { token: ta, method: 'PATCH', body: { dist_municipio: 50 } });
  assert.equal(malo.status, 400);
});
