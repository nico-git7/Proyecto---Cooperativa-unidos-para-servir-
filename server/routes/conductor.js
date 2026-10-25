import { Router } from 'express';
import { requiereRol } from '../auth.js';
import { parametros, transaccion } from '../db.js';
import { normalizarPatente, patenteValida } from '../reglas.js';
import {
  buscarEstacionamientos,
  conMontoActual,
  ErrorNegocio,
  finalizarEstacionamiento,
  iniciarEstacionamiento,
  trabajadorPorId,
} from '../servicios.js';

const MEDIOS_CARGA = { tarjeta: 'Tarjeta de débito/crédito', billetera: 'Billetera virtual', transferencia: 'Transferencia' };

export default function rutasConductor(db) {
  const r = Router();
  r.use(requiereRol('conductor'));

  const vehiculosDe = (id) => db.prepare('SELECT * FROM vehiculos WHERE usuario_id = ? ORDER BY id').all(id);

  r.get('/resumen', (req, res) => {
    const params = parametros(db);
    const u = req.usuario;
    const activos = buscarEstacionamientos(db, `WHERE e.conductor_id = ? AND e.estado = 'activo' ORDER BY e.inicio`, u.id);
    const ultimos = buscarEstacionamientos(db, `WHERE e.conductor_id = ? AND e.estado = 'finalizado' ORDER BY e.fin DESC LIMIT 5`, u.id);
    res.json({
      saldo: db.prepare('SELECT saldo FROM usuarios WHERE id = ?').get(u.id).saldo,
      vehiculos: vehiculosDe(u.id),
      activos: activos.map((e) => conMontoActual(e, params)),
      ultimos,
    });
  });

  r.post('/vehiculos', (req, res) => {
    const patente = normalizarPatente(req.body?.patente);
    if (!patenteValida(patente)) throw new ErrorNegocio('La patente no tiene un formato válido (ej.: AB123CD o ABC123).');
    if (db.prepare('SELECT 1 FROM vehiculos WHERE usuario_id = ? AND patente = ?').get(req.usuario.id, patente)) {
      throw new ErrorNegocio('Ese vehículo ya está en tu cuenta.', 409);
    }
    db.prepare('INSERT INTO vehiculos (usuario_id, patente, alias) VALUES (?, ?, ?)').run(
      req.usuario.id,
      patente,
      String(req.body?.alias || '').trim().slice(0, 40) || null,
    );
    res.status(201).json(vehiculosDe(req.usuario.id));
  });

  r.delete('/vehiculos/:id', (req, res) => {
    db.prepare('DELETE FROM vehiculos WHERE id = ? AND usuario_id = ?').run(Number(req.params.id), req.usuario.id);
    res.json(vehiculosDe(req.usuario.id));
  });

  // El conductor/a identifica al trabajador/a que lo atiende con el ID de su credencial.
  r.get('/trabajador/:id', (req, res) => res.json(trabajadorPorId(db, req.params.id)));

  r.post('/estacionar', (req, res) => {
    const { vehiculo_id, trabajador_id, cuadra_id } = req.body || {};
    const v = db.prepare('SELECT * FROM vehiculos WHERE id = ? AND usuario_id = ?').get(Number(vehiculo_id), req.usuario.id);
    if (!v) throw new ErrorNegocio('Elegí uno de tus vehículos.');
    const t = trabajadorPorId(db, trabajador_id);
    if (!t.cuadras.length) throw new ErrorNegocio(`${t.nombre} no tiene cuadras asignadas en este momento.`);
    // Cuadra: la elegida (si es del trabajador/a), si no la de su jornada en curso, o la única que tenga.
    const elegida = cuadra_id ? t.cuadras.find((c) => c.id === Number(cuadra_id)) : null;
    if (cuadra_id && !elegida) throw new ErrorNegocio(`Esa cuadra no está a cargo de ${t.nombre}.`);
    const cuadra = elegida || t.cuadras.find((c) => c.id === t.cuadra_jornada_id) || (t.cuadras.length === 1 ? t.cuadras[0] : null);
    if (!cuadra) throw new ErrorNegocio(`Elegí en qué cuadra de ${t.nombre} estacionaste.`);
    const e = iniciarEstacionamiento(db, {
      patente: v.patente,
      cuadraId: cuadra.id,
      conductorId: req.usuario.id,
      trabajadorId: t.id,
      medio: 'app',
    });
    res.status(201).json(conMontoActual(e, parametros(db)));
  });

  r.post('/estacionamientos/:id/finalizar', (req, res) => {
    const e = db.prepare('SELECT * FROM estacionamientos WHERE id = ? AND conductor_id = ?').get(Number(req.params.id), req.usuario.id);
    if (!e) throw new ErrorNegocio('Estacionamiento inexistente.', 404);
    const fin = finalizarEstacionamiento(db, e.id);
    res.json({ estacionamiento: fin, saldo: db.prepare('SELECT saldo FROM usuarios WHERE id = ?').get(req.usuario.id).saldo });
  });

  // Carga de saldo. En esta versión el cobro es SIMULADO: falta integrar una pasarela de pago real.
  r.post('/saldo', (req, res) => {
    const monto = Math.round(Number(req.body?.monto));
    const medio = MEDIOS_CARGA[req.body?.medio] ? req.body.medio : 'tarjeta';
    if (!Number.isFinite(monto) || monto < 500 || monto > 100000) throw new ErrorNegocio('El monto debe estar entre $500 y $100.000.');
    const saldo = transaccion(db, () => {
      db.prepare('UPDATE usuarios SET saldo = saldo + ? WHERE id = ?').run(monto, req.usuario.id);
      db.prepare(`INSERT INTO movimientos (usuario_id, tipo, monto, detalle) VALUES (?, 'carga', ?, ?)`).run(
        req.usuario.id,
        monto,
        `Carga con ${MEDIOS_CARGA[medio]}`,
      );
      return db.prepare('SELECT saldo FROM usuarios WHERE id = ?').get(req.usuario.id).saldo;
    });
    res.json({ saldo });
  });

  r.get('/historial', (req, res) => {
    res.json({
      estacionamientos: buscarEstacionamientos(db, `WHERE e.conductor_id = ? ORDER BY e.inicio DESC LIMIT 50`, req.usuario.id),
      movimientos: db.prepare('SELECT * FROM movimientos WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 50').all(req.usuario.id),
    });
  });

  return r;
}
