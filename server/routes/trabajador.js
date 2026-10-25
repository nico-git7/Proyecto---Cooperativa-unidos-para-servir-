import { Router } from 'express';
import { requiereRol } from '../auth.js';
import { parametros } from '../db.js';
import { inicioDiaLocal, normalizarPatente, patenteValida } from '../reglas.js';
import {
  buscarEstacionamientos,
  conMontoActual,
  consultarPatente,
  ErrorNegocio,
  finalizarEstacionamiento,
  iniciarEstacionamiento,
} from '../servicios.js';

export const MOTIVOS_ACTA = [
  'Sin estacionamiento registrado',
  'Se negó a abonar',
  'Estaciona en lugar prohibido',
  'Ocupa espacio reservado (discapacidad, carga y descarga)',
  'Obstruye rampa o garaje',
  'Otro',
];

export default function rutasTrabajador(db) {
  const r = Router();
  r.use(requiereRol('trabajador'));

  const misCuadras = (id) =>
    db
      .prepare(
        `SELECT c.*, z.nombre AS zona, z.tarifa_hora, z.color AS zona_color,
                (SELECT COUNT(*) FROM estacionamientos e WHERE e.cuadra_id = c.id AND e.estado = 'activo') AS ocupados
         FROM cuadras c JOIN zonas z ON z.id = c.zona_id WHERE c.trabajador_id = ? ORDER BY c.calle, c.desde`,
      )
      .all(id);

  const jornadaActiva = (id) =>
    db
      .prepare(
        `SELECT j.*, c.codigo, c.calle, c.desde, c.hasta FROM jornadas j JOIN cuadras c ON c.id = j.cuadra_id
         WHERE j.trabajador_id = ? AND j.fin IS NULL`,
      )
      .get(id) || null;

  const verificarCuadraPropia = (trabajadorId, cuadraId) => {
    const c = db.prepare('SELECT * FROM cuadras WHERE id = ? AND trabajador_id = ?').get(Number(cuadraId), trabajadorId);
    if (!c) throw new ErrorNegocio('Esa cuadra no está asignada a vos.', 403);
    return c;
  };

  r.get('/resumen', (req, res) => {
    const params = parametros(db);
    const id = req.usuario.id;
    const hoy = inicioDiaLocal();
    const cuadras = misCuadras(id);
    const activos = buscarEstacionamientos(db, `WHERE e.trabajador_id = ? AND e.estado = 'activo' ORDER BY e.inicio`, id).map((e) =>
      conMontoActual(e, params),
    );
    const totales = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN e.medio = 'app' THEN e.monto END), 0) AS app,
           COALESCE(SUM(CASE WHEN e.medio = 'efectivo' THEN e.monto END), 0) AS efectivo,
           COUNT(*) AS cantidad
         FROM estacionamientos e
         WHERE e.trabajador_id = ? AND e.estado = 'finalizado' AND e.fin >= ?`,
      )
      .get(id, hoy);
    const aRendir = db
      .prepare(
        `SELECT COALESCE(SUM(monto), 0) AS total FROM estacionamientos
         WHERE registrado_por = ? AND medio = 'efectivo' AND estado = 'finalizado' AND rendido = 0`,
      )
      .get(id).total;
    const horas = db
      .prepare(
        `SELECT COALESCE(SUM((julianday(COALESCE(fin, strftime('%Y-%m-%dT%H:%M:%fZ','now'))) - julianday(inicio)) * 24), 0) AS h
         FROM jornadas WHERE trabajador_id = ? AND inicio >= ?`,
      )
      .get(id, hoy).h;
    const actasHoy = db.prepare('SELECT COUNT(*) AS n FROM actas WHERE trabajador_id = ? AND fecha >= ?').get(id, hoy).n;
    res.json({
      jornada: jornadaActiva(id),
      cuadras,
      activos,
      hoy: { ...totales, total: totales.app + totales.efectivo, horas: Math.round(horas * 10) / 10, actas: actasHoy },
      efectivo_a_rendir: aRendir,
      motivos_acta: MOTIVOS_ACTA,
    });
  });

  r.post('/jornada/iniciar', (req, res) => {
    if (jornadaActiva(req.usuario.id)) throw new ErrorNegocio('Ya tenés una jornada en curso.', 409);
    const cuadra = verificarCuadraPropia(req.usuario.id, req.body?.cuadra_id);
    db.prepare('INSERT INTO jornadas (trabajador_id, cuadra_id, inicio) VALUES (?, ?, ?)').run(req.usuario.id, cuadra.id, new Date().toISOString());
    res.status(201).json(jornadaActiva(req.usuario.id));
  });

  r.post('/jornada/finalizar', (req, res) => {
    const j = jornadaActiva(req.usuario.id);
    if (!j) throw new ErrorNegocio('No tenés una jornada en curso.', 409);
    db.prepare('UPDATE jornadas SET fin = ? WHERE id = ?').run(new Date().toISOString(), j.id);
    res.json({ ok: true });
  });

  r.get('/patente/:patente', (req, res) => res.json(consultarPatente(db, req.params.patente)));

  // Registro de un vehículo que paga en efectivo al trabajador/a (sin app).
  r.post('/estacionamientos', (req, res) => {
    const cuadra = verificarCuadraPropia(req.usuario.id, req.body?.cuadra_id);
    const e = iniciarEstacionamiento(db, {
      patente: req.body?.patente,
      cuadraId: cuadra.id,
      registradoPor: req.usuario.id,
      medio: 'efectivo',
    });
    res.status(201).json(conMontoActual(e, parametros(db)));
  });

  r.post('/estacionamientos/:id/finalizar', (req, res) => {
    const e = db
      .prepare(`SELECT * FROM estacionamientos WHERE id = ? AND medio = 'efectivo' AND registrado_por = ?`)
      .get(Number(req.params.id), req.usuario.id);
    if (!e) throw new ErrorNegocio('Solo podés cerrar los estacionamientos en efectivo que registraste vos.', 404);
    res.json(finalizarEstacionamiento(db, e.id));
  });

  r.post('/actas', (req, res) => {
    const { patente, cuadra_id, motivo, observacion } = req.body || {};
    const p = normalizarPatente(patente);
    if (!patenteValida(p)) throw new ErrorNegocio('La patente no tiene un formato válido.');
    if (!MOTIVOS_ACTA.includes(motivo)) throw new ErrorNegocio('Elegí un motivo de la lista.');
    const cuadra = verificarCuadraPropia(req.usuario.id, cuadra_id);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO actas (patente, cuadra_id, trabajador_id, motivo, observacion) VALUES (?, ?, ?, ?, ?)')
      .run(p, cuadra.id, req.usuario.id, motivo, String(observacion || '').trim().slice(0, 500) || null);
    res.status(201).json(db.prepare('SELECT * FROM actas WHERE id = ?').get(lastInsertRowid));
  });

  r.get('/actas', (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT a.*, c.codigo AS cuadra_codigo, c.calle, c.desde, c.hasta FROM actas a JOIN cuadras c ON c.id = a.cuadra_id
           WHERE a.trabajador_id = ? ORDER BY a.fecha DESC LIMIT 50`,
        )
        .all(req.usuario.id),
    );
  });

  return r;
}
