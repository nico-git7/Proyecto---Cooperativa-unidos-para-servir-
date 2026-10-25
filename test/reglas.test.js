import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularMonto, distribuir, fechaLocal, inicioDiaLocal, minutosFacturables, normalizarPatente, patenteValida } from '../server/reglas.js';

const params = { fraccion_minutos: 15, minimo_minutos: 30 };

test('patentes argentinas', () => {
  assert.equal(normalizarPatente(' ab 123-cd '), 'AB123CD');
  for (const p of ['AB123CD', 'ABC123', '123ABC', 'A123BCD']) assert.ok(patenteValida(p), p);
  for (const p of ['', 'AB12CD', 'ABCD123', '1234567']) assert.ok(!patenteValida(p), p);
});

test('cobro con mínimo y fracción', () => {
  assert.equal(minutosFacturables(0, params), 30);
  assert.equal(minutosFacturables(31, params), 45);
  assert.equal(minutosFacturables(45, params), 45);
  assert.equal(minutosFacturables(45.2, params), 60);
  assert.equal(calcularMonto(10, 1000, params), 500);
  assert.equal(calcularMonto(61, 800, params), 1000);
});

test('día local de Tucumán (UTC-3)', () => {
  const ahora = new Date('2026-04-10T02:30:00Z'); // 9/4 23:30 en Tucumán
  assert.equal(inicioDiaLocal(ahora), '2026-04-09T03:00:00.000Z');
  assert.equal(fechaLocal(ahora.toISOString()), '2026-04-09');
  assert.equal(inicioDiaLocal(ahora, 1), '2026-04-08T03:00:00.000Z');
});

test('la distribución suma exactamente el total', () => {
  const p = { dist_trabajadores: 60, dist_municipio: 25, dist_fondo_solidario: 10, dist_tecnologia: 5 };
  const r = distribuir(12347, p);
  assert.equal(r.reduce((s, x) => s + x.monto, 0), 12347);
  assert.equal(r[1].monto, 3086);
});
