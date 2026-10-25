import { Router } from 'express';
import { hashPassword, requiereRol, usuarioPublico } from '../auth.js';
import { parametros, PARAMETROS_DEFAULT } from '../db.js';
import { distribuir, fechaLocal, inicioDiaLocal, inicioMesLocal } from '../reglas.js';
import { buscarEstacionamientos, conMontoActual, ErrorNegocio, finalizarEstacionamiento } from '../servicios.js';

export default function rutasAdmin(db) {
  const r = Router();
  r.use(requiereRol('admin'));

  r.get('/dashboard', (_req, res) => {
    const params = parametros(db);
    const hoy = inicioDiaLocal();
    const mes = inicioMesLocal();
    const hace7 = inicioDiaLocal(new Date(), 6);

    const sumar = (desde) =>
      db
        .prepare(
          `SELECT COALESCE(SUM(monto),0) AS total, COUNT(*) AS cantidad,
                  COALESCE(SUM(CASE WHEN medio='app' THEN monto END),0) AS app,
                  COALESCE(SUM(CASE WHEN medio='efectivo' THEN monto END),0) AS efectivo
           FROM estacionamientos WHERE estado='finalizado' AND fin >= ?`,
        )
        .get(desde);

    const activos = buscarEstacionamientos(db, `WHERE e.estado = 'activo'`).map((e) => conMontoActual(e, params));
    const zonas = db
      .prepare(
        `SELECT z.id, z.nombre, z.color, z.tarifa_hora, SUM(c.capacidad) AS capacidad, COUNT(c.id) AS cuadras,
                (SELECT COUNT(*) FROM estacionamientos e JOIN cuadras c2 ON c2.id = e.cuadra_id
                 WHERE c2.zona_id = z.id AND e.estado='activo') AS ocupados
         FROM zonas z LEFT JOIN cuadras c ON c.zona_id = z.id GROUP BY z.id ORDER BY z.id`,
      )
      .all();

    const porDia = new Map();
    for (let i = 6; i >= 0; i--) porDia.set(fechaLocal(inicioDiaLocal(new Date(), i)), { app: 0, efectivo: 0 });
    for (const e of db.prepare(`SELECT fin, medio, monto FROM estacionamientos WHERE estado='finalizado' AND fin >= ?`).all(hace7)) {
      const d = porDia.get(fechaLocal(e.fin));
      if (d) d[e.medio] += e.monto;
    }

    const ranking = db
      .prepare(
        `SELECT c.codigo, c.calle, c.desde, c.hasta, t.nombre AS trabajador, COALESCE(SUM(e.monto),0) AS total, COUNT(e.id) AS cantidad
         FROM cuadras c LEFT JOIN usuarios t ON t.id = c.trabajador_id
         LEFT JOIN estacionamientos e ON e.cuadra_id = c.id AND e.estado='finalizado' AND e.fin >= ?
         GROUP BY c.id ORDER BY total DESC LIMIT 6`,
      )
      .all(mes);

    const mesTotales = sumar(mes);
    res.json({
      hoy: { ...sumar(hoy), en_curso: activos.reduce((s, e) => s + e.monto_actual, 0) },
      mes: mesTotales,
      activos: activos.length,
      zonas,
      ultimos_7_dias: [...porDia].map(([fecha, v]) => ({ fecha, ...v })),
      distribucion_mes: distribuir(mesTotales.total, params),
      trabajadores: {
        total: db.prepare(`SELECT COUNT(*) AS n FROM usuarios WHERE rol='trabajador' AND activo=1`).get().n,
        en_jornada: db.prepare('SELECT COUNT(*) AS n FROM jornadas WHERE fin IS NULL').get().n,
      },
      actas_pendientes: db.prepare(`SELECT COUNT(*) AS n FROM actas WHERE estado='pendiente'`).get().n,
      efectivo_a_rendir: db
        .prepare(`SELECT COALESCE(SUM(monto),0) AS t FROM estacionamientos WHERE medio='efectivo' AND estado='finalizado' AND rendido=0`)
        .get().t,
      ranking_cuadras: ranking,
    });
  });

  r.get('/estacionamientos', (req, res) => {
    const params = parametros(db);
    const estado = req.query.estado === 'finalizado' ? 'finalizado' : 'activo';
    const orden = estado === 'activo' ? 'e.inicio' : 'e.fin DESC';
    res.json(buscarEstacionamientos(db, `WHERE e.estado = ? ORDER BY ${orden} LIMIT 200`, estado).map((e) => conMontoActual(e, params)));
  });

  r.post('/estacionamientos/:id/finalizar', (req, res) => res.json(finalizarEstacionamiento(db, req.params.id)));

  r.get('/estacionamientos.csv', (req, res) => {
    const desde = req.query.desde ? inicioDiaLocal(new Date(`${req.query.desde}T12:00:00Z`)) : inicioMesLocal();
    const filas = buscarEstacionamientos(db, `WHERE e.inicio >= ? ORDER BY e.inicio`, desde);
    const cols = ['id', 'patente', 'zona', 'cuadra_codigo', 'calle', 'desde', 'hasta', 'medio', 'inicio', 'fin', 'minutos', 'tarifa_hora', 'monto', 'estado', 'trabajador'];
    const esc = (v) => (v == null ? '' : /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [cols.join(','), ...filas.map((f) => cols.map((c) => esc(f[c])).join(','))].join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="estacionamientos-${fechaLocal(desde)}.csv"`);
    res.send('﻿' + csv);
  });

  r.get('/trabajadores', (_req, res) => {
    const mes = inicioMesLocal();
    const filas = db
      .prepare(
        `SELECT u.*,
           (SELECT COUNT(*) FROM jornadas j WHERE j.trabajador_id = u.id AND j.fin IS NULL) AS en_jornada,
           (SELECT COALESCE(SUM(e.monto),0) FROM estacionamientos e
              WHERE e.trabajador_id = u.id AND e.estado='finalizado' AND e.fin >= ?) AS recaudado_mes,
           (SELECT COALESCE(SUM(e.monto),0) FROM estacionamientos e
              WHERE e.registrado_por = u.id AND e.medio='efectivo' AND e.estado='finalizado' AND e.rendido=0) AS efectivo_a_rendir,
           (SELECT COALESCE(SUM((julianday(COALESCE(j.fin, strftime('%Y-%m-%dT%H:%M:%fZ','now'))) - julianday(j.inicio))*24),0)
              FROM jornadas j WHERE j.trabajador_id = u.id AND j.inicio >= ?) AS horas_mes
         FROM usuarios u WHERE u.rol = 'trabajador' ORDER BY u.activo DESC, u.nombre`,
      )
      .all(mes, mes);
    const cuadras = db.prepare('SELECT id, codigo, calle, desde, hasta, trabajador_id FROM cuadras').all();
    res.json(
      filas.map((u) => ({
        ...usuarioPublico(u),
        horas_mes: Math.round(u.horas_mes * 10) / 10,
        cuadras: cuadras.filter((c) => c.trabajador_id === u.id),
      })),
    );
  });

  r.post('/trabajadores', (req, res) => {
    const { nombre, dni, email, telefono, cooperativa, legajo, password } = req.body || {};
    if (!nombre?.trim() || !email?.trim() || !dni?.trim()) throw new ErrorNegocio('Completá nombre, DNI y email.');
    if (!['APARKAR LTDA', 'UNIDOS PARA SERVIR'].includes(cooperativa)) throw new ErrorNegocio('Elegí la cooperativa.');
    const mail = email.trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(mail)) throw new ErrorNegocio('Ya existe un usuario con ese email.', 409);
    const clave = password && String(password).length >= 6 ? String(password) : String(dni).trim();
    // ID para que el conductor/a lo identifique al estacionar: el indicado o el próximo libre (APK-108, UPS-109…).
    let id = String(legajo || '').trim().toUpperCase();
    if (!id) {
      const prefijo = cooperativa === 'APARKAR LTDA' ? 'APK' : 'UPS';
      const max = db.prepare(`SELECT MAX(CAST(SUBSTR(legajo, INSTR(legajo, '-') + 1) AS INTEGER)) AS n FROM usuarios WHERE legajo LIKE '%-%'`).get().n || 99;
      id = `${prefijo}-${max + 1}`;
    }
    if (!/^[A-Z0-9-]{3,12}$/.test(id)) throw new ErrorNegocio('El ID solo puede tener letras, números y guiones (ej.: APK-120).');
    const idNormal = id.replace(/-/g, '');
    if (db.prepare(`SELECT 1 FROM usuarios WHERE REPLACE(UPPER(legajo), '-', '') = ?`).get(idNormal)) throw new ErrorNegocio('Ese ID ya está en uso.', 409);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO usuarios (rol, nombre, dni, email, telefono, cooperativa, legajo, password_hash)
         VALUES ('trabajador', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(nombre.trim(), dni.trim(), mail, telefono || null, cooperativa, id, hashPassword(clave));
    res.status(201).json(usuarioPublico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(lastInsertRowid)));
  });

  r.patch('/trabajadores/:id', (req, res) => {
    const u = db.prepare(`SELECT * FROM usuarios WHERE id = ? AND rol = 'trabajador'`).get(Number(req.params.id));
    if (!u) throw new ErrorNegocio('Trabajador/a inexistente.', 404);
    if (typeof req.body?.activo === 'boolean') {
      db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(req.body.activo ? 1 : 0, u.id);
      if (!req.body.activo) db.prepare('DELETE FROM sesiones WHERE usuario_id = ?').run(u.id);
    }
    res.json(usuarioPublico(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(u.id)));
  });

  // Marca como rendido todo el efectivo cobrado por el trabajador/a.
  r.post('/trabajadores/:id/rendir', (req, res) => {
    const id = Number(req.params.id);
    const total = db
      .prepare(`SELECT COALESCE(SUM(monto),0) AS t FROM estacionamientos WHERE registrado_por=? AND medio='efectivo' AND estado='finalizado' AND rendido=0`)
      .get(id).t;
    db.prepare(`UPDATE estacionamientos SET rendido = 1 WHERE registrado_por=? AND medio='efectivo' AND estado='finalizado' AND rendido=0`).run(id);
    res.json({ rendido: total });
  });

  r.get('/cuadras', (_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT c.*, z.nombre AS zona, z.color AS zona_color, t.nombre AS trabajador
           FROM cuadras c JOIN zonas z ON z.id = c.zona_id LEFT JOIN usuarios t ON t.id = c.trabajador_id
           ORDER BY z.id, c.calle, c.desde`,
        )
        .all(),
    );
  });

  r.put('/cuadras/:id/trabajador', (req, res) => {
    const tid = req.body?.trabajador_id ? Number(req.body.trabajador_id) : null;
    if (tid && !db.prepare(`SELECT 1 FROM usuarios WHERE id = ? AND rol='trabajador' AND activo=1`).get(tid)) {
      throw new ErrorNegocio('Trabajador/a inexistente o inactivo.');
    }
    db.prepare('UPDATE cuadras SET trabajador_id = ? WHERE id = ?').run(tid, Number(req.params.id));
    res.json({ ok: true });
  });

  r.patch('/zonas/:id', (req, res) => {
    const tarifa = Math.round(Number(req.body?.tarifa_hora));
    if (!Number.isFinite(tarifa) || tarifa < 1 || tarifa > 100000) throw new ErrorNegocio('Tarifa inválida.');
    db.prepare('UPDATE zonas SET tarifa_hora = ? WHERE id = ?').run(tarifa, Number(req.params.id));
    res.json(db.prepare('SELECT * FROM zonas WHERE id = ?').get(Number(req.params.id)));
  });

  r.get('/actas', (req, res) => {
    const estado = ['pendiente', 'validada', 'anulada'].includes(req.query.estado) ? req.query.estado : null;
    res.json(
      db
        .prepare(
          `SELECT a.*, c.codigo AS cuadra_codigo, c.calle, c.desde, c.hasta, t.nombre AS trabajador
           FROM actas a JOIN cuadras c ON c.id = a.cuadra_id JOIN usuarios t ON t.id = a.trabajador_id
           ${estado ? 'WHERE a.estado = ?' : ''} ORDER BY a.fecha DESC LIMIT 200`,
        )
        .all(...(estado ? [estado] : [])),
    );
  });

  r.patch('/actas/:id', (req, res) => {
    if (!['validada', 'anulada'].includes(req.body?.estado)) throw new ErrorNegocio('Estado inválido.');
    db.prepare(`UPDATE actas SET estado = ? WHERE id = ? AND estado = 'pendiente'`).run(req.body.estado, Number(req.params.id));
    res.json(db.prepare('SELECT * FROM actas WHERE id = ?').get(Number(req.params.id)));
  });

  r.patch('/parametros', (req, res) => {
    const cambios = Object.entries(req.body || {}).filter(([k]) => k in PARAMETROS_DEFAULT);
    const RANGOS = { fraccion_minutos: [1, 60], minimo_minutos: [0, 240], saldo_minimo_inicio: [0, 100000] };
    for (const [k, v] of cambios) {
      if (k === 'horario') continue;
      const [min, max] = RANGOS[k] || [0, 100];
      if (!/^\d+$/.test(String(v)) || Number(v) < min || Number(v) > max) throw new ErrorNegocio(`Valor inválido para ${k.replace(/_/g, ' ')}.`);
    }
    const dist = ['dist_trabajadores', 'dist_municipio', 'dist_fondo_solidario', 'dist_tecnologia'];
    const actual = { ...parametros(db), ...Object.fromEntries(cambios) };
    if (dist.reduce((s, k) => s + Number(actual[k]), 0) !== 100) throw new ErrorNegocio('Los porcentajes de distribución deben sumar 100.');
    const up = db.prepare('UPDATE parametros SET valor = ? WHERE clave = ?');
    for (const [k, v] of cambios) up.run(String(v), k);
    res.json(parametros(db));
  });

  return r;
}
