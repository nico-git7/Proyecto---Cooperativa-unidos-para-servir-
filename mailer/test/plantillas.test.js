import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatearFecha } from '../src/formato.js';
import { plantillas, renderizar } from '../src/plantillas/index.js';

const dependencia = { nombre: 'Comisaría Seccional 1ª', direccion: 'Junín 650', localidad: 'San Miguel de Tucumán', telefono: '(0381) 452-1001' };

test('denuncia recibida incluye número, código y enlace de seguimiento', () => {
  const { asunto, html, texto } = renderizar('denuncia-recibida', {
    nombre: 'Lucía', numero: '000421/2026', codigo: 'VQQ6-27YR', tipo: 'Robo de motocicleta',
    fecha: '2026-11-06T16:28:14Z', fechaHecho: '2026-11-06T13:30:00Z', lugar: 'Av. Mate de Luna 2350',
    dependencia, urlSeguimiento: 'https://denuncias.example/seguimiento?codigo=VQQ6-27YR',
  });
  assert.match(asunto, /000421\/2026/);
  assert.match(html, /VQQ6-27YR/);
  assert.match(html, /seguimiento\?codigo=VQQ6-27YR/);
  assert.match(texto, /VQQ6-27YR/);
});

test('escapa el contenido para evitar inyección de HTML', () => {
  const { html } = renderizar('denuncia-actualizada', {
    nombre: '<script>alert(1)</script>', numero: '1/2026', estado: 'En investigación', mensaje: '<b>x</b>',
    fecha: '2026-11-06T16:28:14Z', urlSeguimiento: 'https://x',
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('todas las plantillas renderizan con datos mínimos', () => {
  for (const nombre of Object.keys(plantillas)) {
    const r = renderizar(nombre, { url: 'https://x', urlSeguimiento: 'https://x' });
    assert.ok(r.asunto && r.html.startsWith('<!doctype html>'), nombre);
  }
});

test('plantilla inexistente devuelve error 400', () => {
  assert.throws(() => renderizar('no-existe', {}), (e) => e.status === 400);
});

test('formatea fechas en hora de Tucumán', () => {
  assert.equal(formatearFecha('2026-11-06T16:28:00Z'), '06/11/2026 13:28 hs');
});
