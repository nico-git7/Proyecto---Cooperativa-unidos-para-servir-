// Operaciones de negocio compartidas entre los distintos perfiles.
import { parametros, transaccion } from './db.js';
import { calcularMonto, minutosEntre, normalizarIdTrabajador, normalizarPatente, patenteValida } from './reglas.js';

export class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

const SELECT_ESTACIONAMIENTO = `
  SELECT e.*, c.codigo AS cuadra_codigo, c.calle, c.desde, c.hasta, z.id AS zona_id, z.nombre AS zona,
         z.color AS zona_color, t.nombre AS trabajador, t.legajo AS trabajador_legajo
  FROM estacionamientos e
  JOIN cuadras c ON c.id = e.cuadra_id
  JOIN zonas z ON z.id = c.zona_id
  LEFT JOIN usuarios t ON t.id = COALESCE(e.trabajador_id, c.trabajador_id)`;

export function buscarEstacionamientos(db, where = '', ...args) {
  return db.prepare(`${SELECT_ESTACIONAMIENTO} ${where}`).all(...args);
}

/** Agrega a un estacionamiento activo los minutos transcurridos y el monto que se cobraría ahora. */
export function conMontoActual(e, params, ahora = new Date().toISOString()) {
  if (e.estado !== 'activo') return e;
  const minutos = minutosEntre(e.inicio, ahora);
  return { ...e, minutos_transcurridos: Math.floor(minutos), monto_actual: calcularMonto(minutos, e.tarifa_hora, params) };
}

export function cuadraConTarifa(db, { cuadraId, codigo }) {
  const sql = `SELECT c.*, z.tarifa_hora, z.nombre AS zona FROM cuadras c JOIN zonas z ON z.id = c.zona_id WHERE `;
  const cuadra = cuadraId
    ? db.prepare(sql + 'c.id = ?').get(Number(cuadraId))
    : db.prepare(sql + 'c.codigo = ?').get(String(codigo ?? '').toUpperCase().trim());
  if (!cuadra) throw new ErrorNegocio('No encontramos esa cuadra. Revisá el código.', 404);
  return cuadra;
}

export function estacionamientoActivoDe(db, patente) {
  return buscarEstacionamientos(db, `WHERE e.patente = ? AND e.estado = 'activo'`, patente)[0] || null;
}

/**
 * Busca un trabajador/a activo por su ID (legajo) y devuelve lo que necesita ver el conductor/a:
 * nombre, cooperativa, si está en jornada y las cuadras que tiene asignadas.
 */
export function trabajadorPorId(db, id) {
  const buscado = normalizarIdTrabajador(id);
  if (!buscado) throw new ErrorNegocio('Ingresá el ID del trabajador/a.');
  const t = db
    .prepare(
      `SELECT id, nombre, cooperativa, legajo FROM usuarios
       WHERE rol = 'trabajador' AND activo = 1 AND REPLACE(REPLACE(UPPER(legajo), '-', ''), ' ', '') = ?`,
    )
    .get(buscado);
  if (!t) throw new ErrorNegocio('No hay ningún trabajador/a activo con ese ID. Revisalo en su credencial.', 404);
  const jornada = db.prepare('SELECT cuadra_id FROM jornadas WHERE trabajador_id = ? AND fin IS NULL').get(t.id);
  const cuadras = db
    .prepare(
      `SELECT c.id, c.codigo, c.calle, c.desde, c.hasta, c.capacidad, z.nombre AS zona, z.color AS zona_color, z.tarifa_hora,
              (SELECT COUNT(*) FROM estacionamientos e WHERE e.cuadra_id = c.id AND e.estado = 'activo') AS ocupados
       FROM cuadras c JOIN zonas z ON z.id = c.zona_id WHERE c.trabajador_id = ? ORDER BY c.calle, c.desde`,
    )
    .all(t.id);
  return { ...t, en_jornada: Boolean(jornada), cuadra_jornada_id: jornada?.cuadra_id ?? null, cuadras };
}

export function iniciarEstacionamiento(db, { patente, cuadraId, codigo, conductorId = null, registradoPor = null, trabajadorId = null, medio, ahora }) {
  const p = normalizarPatente(patente);
  if (!patenteValida(p)) throw new ErrorNegocio('La patente no tiene un formato válido (ej.: AB123CD o ABC123).');
  const params = parametros(db);
  const cuadra = cuadraConTarifa(db, { cuadraId, codigo });

  return transaccion(db, () => {
    if (estacionamientoActivoDe(db, p)) throw new ErrorNegocio(`La patente ${p} ya tiene un estacionamiento en curso.`, 409);
    if (medio === 'app') {
      const { saldo } = db.prepare('SELECT saldo FROM usuarios WHERE id = ?').get(conductorId);
      const minimo = Math.max(params.saldo_minimo_inicio, calcularMonto(0, cuadra.tarifa_hora, params));
      if (saldo < minimo) throw new ErrorNegocio(`Necesitás al menos $${minimo} de saldo para estacionar. Cargá saldo y volvé a intentar.`, 402);
    }
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO estacionamientos (patente, cuadra_id, conductor_id, registrado_por, trabajador_id, medio, inicio, tarifa_hora)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(p, cuadra.id, conductorId, registradoPor, trabajadorId ?? registradoPor, medio, ahora || new Date().toISOString(), cuadra.tarifa_hora);
    return buscarEstacionamientos(db, 'WHERE e.id = ?', lastInsertRowid)[0];
  });
}

export function finalizarEstacionamiento(db, id, ahora = new Date().toISOString()) {
  const params = parametros(db);
  return transaccion(db, () => {
    const e = db.prepare(`SELECT * FROM estacionamientos WHERE id = ?`).get(Number(id));
    if (!e) throw new ErrorNegocio('Estacionamiento inexistente.', 404);
    if (e.estado !== 'activo') throw new ErrorNegocio('Ese estacionamiento ya fue finalizado.', 409);
    const minutos = minutosEntre(e.inicio, ahora);
    const monto = calcularMonto(minutos, e.tarifa_hora, params);
    db.prepare(`UPDATE estacionamientos SET fin = ?, minutos = ?, monto = ?, estado = 'finalizado' WHERE id = ?`).run(
      ahora,
      Math.ceil(minutos),
      monto,
      e.id,
    );
    if (e.medio === 'app' && e.conductor_id) {
      db.prepare('UPDATE usuarios SET saldo = saldo - ? WHERE id = ?').run(monto, e.conductor_id);
      db.prepare(`INSERT INTO movimientos (usuario_id, tipo, monto, detalle, fecha) VALUES (?, 'pago', ?, ?, ?)`).run(
        e.conductor_id,
        -monto,
        `Estacionamiento ${e.patente}`,
        ahora,
      );
    }
    return buscarEstacionamientos(db, 'WHERE e.id = ?', e.id)[0];
  });
}

/** Lo que ve un trabajador/a al consultar una patente en la calle. */
export function consultarPatente(db, patente) {
  const p = normalizarPatente(patente);
  if (!patenteValida(p)) throw new ErrorNegocio('La patente no tiene un formato válido.');
  const params = parametros(db);
  const activo = estacionamientoActivoDe(db, p);
  const actasPendientes = db.prepare(`SELECT COUNT(*) AS n FROM actas WHERE patente = ? AND estado = 'pendiente'`).get(p).n;
  return {
    patente: p,
    habilitado: Boolean(activo),
    estacionamiento: activo ? conMontoActual(activo, params) : null,
    actas_pendientes: actasPendientes,
  };
}
