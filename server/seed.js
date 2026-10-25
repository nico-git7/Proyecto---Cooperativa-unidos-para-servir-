// Datos de demostración: zonas, cuadras, trabajadores/as y 30 días de movimiento simulado.
// Calles reales de San Miguel de Tucumán; tarifas, nombres y patentes son ficticios.
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { hashPassword } from './auth.js';
import { abrirDB, parametros, transaccion } from './db.js';
import { calcularMonto, inicioDiaLocal } from './reglas.js';

export const PASSWORD_DEMO = 'demo1234';

const ZONAS = [
  { nombre: 'Microcentro', descripcion: 'Alrededores de Plaza Independencia', tarifa_hora: 1000, color: '#0f766e' },
  { nombre: 'Barrio Norte', descripcion: 'Entre Av. Sarmiento y calle Santiago del Estero', tarifa_hora: 800, color: '#b45309' },
  { nombre: 'Centro Sur', descripcion: 'Zona comercial al sur de la plaza', tarifa_hora: 700, color: '#6d28d9' },
];

// [zona, código, calle, desde, hasta, capacidad]
const CUADRAS = [
  [0, 'SM500', 'San Martín', 500, 600, 14],
  [0, 'SM600', 'San Martín', 600, 700, 14],
  [0, 'VS400', '24 de Septiembre', 400, 500, 12],
  [0, 'VS500', '24 de Septiembre', 500, 600, 12],
  [0, 'LA100', 'Laprida', 100, 200, 10],
  [0, 'MY200', '25 de Mayo', 200, 300, 12],
  [1, 'SG400', 'Santiago del Estero', 400, 500, 16],
  [1, 'SG500', 'Santiago del Estero', 500, 600, 16],
  [1, 'SA300', 'Salta', 300, 400, 12],
  [1, 'MA500', 'Maipú', 500, 600, 14],
  [2, 'CO400', 'Córdoba', 400, 500, 14],
  [2, 'SJ500', 'San Juan', 500, 600, 12],
  [2, 'CR400', 'Crisóstomo Álvarez', 400, 500, 12],
  [2, 'CG100', 'Congreso', 100, 200, 10],
];

// [nombre, cooperativa, códigos de cuadras asignadas]
const TRABAJADORES = [
  ['Ramón Díaz', 'APARKAR LTDA', ['SM500', 'SM600']],
  ['Graciela Medina', 'UNIDOS PARA SERVIR', ['VS400']],
  ['Hugo Albornoz', 'APARKAR LTDA', ['VS500']],
  ['Silvia Juárez', 'UNIDOS PARA SERVIR', ['LA100', 'MY200']],
  ['Marcelo Ruiz', 'APARKAR LTDA', ['SG400']],
  ['Norma Herrera', 'UNIDOS PARA SERVIR', ['SG500', 'SA300']],
  ['Daniel Paz', 'UNIDOS PARA SERVIR', ['MA500']],
  ['Rosa Gómez', 'APARKAR LTDA', ['CO400', 'SJ500']],
  ['Walter Sosa', 'UNIDOS PARA SERVIR', ['CR400', 'CG100']],
];

function prng(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sembrar(db, { ahora = new Date() } = {}) {
  const rnd = prng(20260425);
  const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];
  const letra = () => String.fromCharCode(65 + entre(0, 25));
  const patente = () =>
    rnd() < 0.55 ? `A${elegir('ABCDEFG')}${entre(100, 999)}${letra()}${letra()}` : `${elegir('FGHIJKLMNOP')}${letra()}${letra()}${entre(100, 999)}`;
  const hash = hashPassword(PASSWORD_DEMO);
  const params = parametros(db);

  transaccion(db, () => {
    const insUsuario = db.prepare(
      `INSERT INTO usuarios (rol, nombre, dni, email, telefono, cooperativa, legajo, password_hash, saldo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insUsuario.run('admin', 'Administración Cooperativas', null, 'admin@demo.com', null, null, null, hash, 0).lastInsertRowid;
    const conductorId = insUsuario.run('conductor', 'Lucía Fernández', '35123456', 'conductor@demo.com', '381 555-0101', null, null, hash, 6500)
      .lastInsertRowid;
    db.prepare('INSERT INTO vehiculos (usuario_id, patente, alias) VALUES (?, ?, ?), (?, ?, ?)').run(
      conductorId, 'AE123FG', 'Mi auto', conductorId, 'KLM482', 'Auto de mamá',
    );

    const zonaIds = ZONAS.map(
      (z) => db.prepare('INSERT INTO zonas (nombre, descripcion, tarifa_hora, color) VALUES (?, ?, ?, ?)').run(z.nombre, z.descripcion, z.tarifa_hora, z.color).lastInsertRowid,
    );
    const cuadras = CUADRAS.map(([zi, codigo, calle, desde, hasta, capacidad]) => ({
      id: db
        .prepare('INSERT INTO cuadras (zona_id, codigo, calle, desde, hasta, capacidad) VALUES (?, ?, ?, ?, ?, ?)')
        .run(zonaIds[zi], codigo, calle, desde, hasta, capacidad).lastInsertRowid,
      codigo,
      capacidad,
      tarifa: ZONAS[zi].tarifa_hora,
    }));
    const porCodigo = Object.fromEntries(cuadras.map((c) => [c.codigo, c]));

    TRABAJADORES.forEach(([nombre, coop, codigos], i) => {
      const email = i === 0 ? 'trabajador@demo.com' : `${nombre.split(' ')[0].toLowerCase()}@demo.com`;
      const dni = String(20000000 + i * 1234567);
      const id = insUsuario.run('trabajador', nombre, dni, email, `381 555-02${String(i).padStart(2, '0')}`, coop, `${coop === 'APARKAR LTDA' ? 'APK' : 'UPS'}-${100 + i}`, hash, 0)
        .lastInsertRowid;
      for (const c of codigos) {
        db.prepare('UPDATE cuadras SET trabajador_id = ? WHERE codigo = ?').run(id, c);
        porCodigo[c].trabajador = id;
      }
    });

    const insEst = db.prepare(
      `INSERT INTO estacionamientos (patente, cuadra_id, conductor_id, registrado_por, medio, inicio, fin, minutos, monto, tarifa_hora, estado, rendido)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insMov = db.prepare(`INSERT INTO movimientos (usuario_id, tipo, monto, detalle, fecha) VALUES (?, ?, ?, ?, ?)`);
    const insJornada = db.prepare('INSERT INTO jornadas (trabajador_id, cuadra_id, inicio, fin) VALUES (?, ?, ?, ?)');
    const hoy = inicioDiaLocal(ahora);
    const HORA = 3600000;

    // Historia: últimos 30 días hábiles (domingos sin cobro).
    for (let d = 30; d >= 1; d--) {
      const dia = Date.parse(inicioDiaLocal(ahora, d));
      const dow = new Date(dia + 12 * HORA).getUTCDay();
      if (dow === 0) continue;
      const finJornada = dow === 6 ? 13 : 20;
      const turno = dow === 6 ? 5 : 7; // horas de la jornada registrada de cada trabajador/a
      for (const t of new Set(cuadras.map((c) => c.trabajador))) {
        const c = cuadras.find((x) => x.trabajador === t);
        insJornada.run(t, c.id, new Date(dia + 8 * HORA).toISOString(), new Date(dia + (8 + turno) * HORA).toISOString());
      }
      for (const c of cuadras) {
        const autos = Math.round(c.capacidad * (dow === 6 ? 1.1 : 2.2) * (0.7 + rnd() * 0.6));
        for (let k = 0; k < autos; k++) {
          const inicio = dia + (8 + rnd() * (finJornada - 9)) * HORA;
          const minutos = entre(20, 170);
          const app = rnd() < 0.42;
          insEst.run(
            patente(), c.id, null, app ? null : c.trabajador, app ? 'app' : 'efectivo',
            new Date(inicio).toISOString(), new Date(inicio + minutos * 60000).toISOString(),
            minutos, calcularMonto(minutos, c.tarifa, params), c.tarifa, 'finalizado', app ? 0 : 1,
          );
        }
      }
    }

    // Hoy: jornadas en curso, estacionamientos ya cerrados (efectivo sin rendir) y vehículos estacionados ahora.
    const ahoraMs = ahora.getTime();
    const desdeHoy = Math.max(Date.parse(hoy) + 8 * HORA, ahoraMs - 5 * HORA);
    const trabajadoresActivos = [...new Set(cuadras.map((c) => c.trabajador))].filter((_, i) => i !== 6);
    for (const t of trabajadoresActivos) {
      insJornada.run(t, cuadras.find((x) => x.trabajador === t).id, new Date(Math.min(desdeHoy, ahoraMs - 30 * 60000)).toISOString(), null);
    }
    for (const c of cuadras.filter((x) => trabajadoresActivos.includes(x.trabajador))) {
      for (let k = 0; k < entre(3, 8); k++) {
        const minutos = entre(20, 120);
        const fin = ahoraMs - entre(5, 90) * 60000;
        const inicio = fin - minutos * 60000;
        const app = rnd() < 0.45;
        insEst.run(
          patente(), c.id, null, app ? null : c.trabajador, app ? 'app' : 'efectivo',
          new Date(inicio).toISOString(), new Date(fin).toISOString(), minutos,
          calcularMonto(minutos, c.tarifa, params), c.tarifa, 'finalizado', 0,
        );
      }
      for (let k = 0; k < Math.round(c.capacidad * (0.35 + rnd() * 0.45)); k++) {
        const app = rnd() < 0.45;
        insEst.run(
          patente(), c.id, null, app ? null : c.trabajador, app ? 'app' : 'efectivo',
          new Date(ahoraMs - entre(4, 110) * 60000).toISOString(), null, null, null, c.tarifa, 'activo', 0,
        );
      }
    }

    // Historia propia de la conductora de demo.
    insMov.run(conductorId, 'carga', 10000, 'Carga con Billetera virtual', new Date(ahoraMs - 9 * 24 * HORA).toISOString());
    for (const [diasAtras, codigo, minutos, horaLocal] of [[8, 'SM500', 75, 10.25], [6, 'SG400', 50, 17.5], [3, 'VS400', 110, 9], [1, 'SM600', 40, 12.75]]) {
      const c = porCodigo[codigo];
      const inicio = Date.parse(inicioDiaLocal(ahora, diasAtras)) + horaLocal * HORA;
      const monto = calcularMonto(minutos, c.tarifa, params);
      insEst.run('AE123FG', c.id, conductorId, null, 'app', new Date(inicio).toISOString(), new Date(inicio + minutos * 60000).toISOString(), minutos, monto, c.tarifa, 'finalizado', 0);
      insMov.run(conductorId, 'pago', -monto, 'Estacionamiento AE123FG', new Date(inicio + minutos * 60000).toISOString());
    }
    const gastado = db.prepare(`SELECT -SUM(monto) AS g FROM movimientos WHERE usuario_id = ? AND tipo = 'pago'`).get(conductorId).g;
    db.prepare('UPDATE usuarios SET saldo = ? WHERE id = ?').run(10000 - gastado, conductorId);

    // Actas pendientes de validación.
    const insActa = db.prepare('INSERT INTO actas (patente, cuadra_id, trabajador_id, motivo, observacion, fecha, estado) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const motivos = ['Sin estacionamiento registrado', 'Se negó a abonar', 'Obstruye rampa o garaje', 'Estaciona en lugar prohibido'];
    for (let k = 0; k < 9; k++) {
      const c = elegir(cuadras);
      insActa.run(patente(), c.id, c.trabajador, elegir(motivos), k % 3 === 0 ? 'Se dejó aviso en el parabrisas.' : null,
        new Date(ahoraMs - entre(10, 72 * 60) * 60000).toISOString(), k < 5 ? 'pendiente' : elegir(['validada', 'anulada']));
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.env.DB_PATH || resolve(process.cwd(), 'data', 'estacionamiento.db');
  if (process.argv.includes('--reset')) for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });
  const db = abrirDB(path);
  if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n) {
    console.log('La base ya tiene datos. Usá "npm run seed" para regenerarla desde cero.');
  } else {
    sembrar(db);
    console.log(`Datos de demostración cargados en ${path}`);
    console.log(`Usuarios: conductor@demo.com · trabajador@demo.com · admin@demo.com (contraseña: ${PASSWORD_DEMO})`);
  }
}
