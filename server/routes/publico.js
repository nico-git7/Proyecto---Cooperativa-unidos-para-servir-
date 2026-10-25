import { Router } from 'express';
import { crearSesion, hashPassword, usuarioPublico, verificarPassword } from '../auth.js';
import { parametros } from '../db.js';
import { distribuir, inicioMesLocal } from '../reglas.js';
import { ErrorNegocio } from '../servicios.js';

export default function rutasPublicas(db) {
  const r = Router();

  r.post('/auth/registro', (req, res) => {
    const { nombre, email, password, telefono, dni } = req.body || {};
    if (!nombre?.trim() || !email?.trim() || !password) throw new ErrorNegocio('Completá nombre, email y contraseña.');
    if (String(password).length < 6) throw new ErrorNegocio('La contraseña debe tener al menos 6 caracteres.');
    const mail = String(email).trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(mail)) throw new ErrorNegocio('Ya existe una cuenta con ese email.', 409);
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO usuarios (rol, nombre, email, telefono, dni, password_hash) VALUES ('conductor', ?, ?, ?, ?, ?)`)
      .run(nombre.trim(), mail, telefono || null, dni || null, hashPassword(password));
    const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(lastInsertRowid);
    res.status(201).json({ token: crearSesion(db, usuario.id), usuario: usuarioPublico(usuario) });
  });

  r.post('/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(String(email || '').trim().toLowerCase());
    if (!usuario || !verificarPassword(password || '', usuario.password_hash)) {
      throw new ErrorNegocio('Email o contraseña incorrectos.', 401);
    }
    res.json({ token: crearSesion(db, usuario.id), usuario: usuarioPublico(usuario) });
  });

  r.post('/auth/logout', (req, res) => {
    if (req.token) db.prepare('DELETE FROM sesiones WHERE token = ?').run(req.token);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => {
    if (!req.usuario) return res.status(401).json({ error: 'Sin sesión.' });
    res.json(usuarioPublico(req.usuario));
  });

  r.get('/parametros', (_req, res) => res.json({ ...parametros(db), demo: process.env.DEMO !== '0' }));

  r.get('/zonas', (_req, res) => {
    const zonas = db.prepare('SELECT * FROM zonas ORDER BY id').all();
    const cuadras = db
      .prepare(
        `SELECT c.id, c.zona_id, c.codigo, c.calle, c.desde, c.hasta, c.capacidad, t.nombre AS trabajador,
                (SELECT COUNT(*) FROM estacionamientos e WHERE e.cuadra_id = c.id AND e.estado = 'activo') AS ocupados
         FROM cuadras c LEFT JOIN usuarios t ON t.id = c.trabajador_id ORDER BY c.calle, c.desde`,
      )
      .all();
    res.json(zonas.map((z) => ({ ...z, cuadras: cuadras.filter((c) => c.zona_id === z.id) })));
  });

  // Datos agregados y anónimos para el portal de transparencia.
  r.get('/transparencia', (_req, res) => {
    const params = parametros(db);
    const desdeMes = inicioMesLocal();
    const mes = db
      .prepare(`SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto),0) AS recaudado FROM estacionamientos WHERE estado='finalizado' AND fin >= ?`)
      .get(desdeMes);
    const trabajadores = db.prepare(`SELECT COUNT(*) AS n FROM usuarios WHERE rol='trabajador' AND activo=1`).get().n;
    const cuadras = db.prepare('SELECT COUNT(*) AS n FROM cuadras').get().n;
    res.json({
      desde: desdeMes,
      estacionamientos: mes.cantidad,
      recaudado: mes.recaudado,
      distribucion: distribuir(mes.recaudado, params),
      trabajadores,
      cuadras,
    });
  });

  return r;
}
