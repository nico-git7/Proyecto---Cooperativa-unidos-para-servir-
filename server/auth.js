import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verificarPassword(password, almacenado) {
  const [salt, hash] = String(almacenado).split(':');
  if (!salt || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const real = scryptSync(String(password), salt, esperado.length);
  return timingSafeEqual(esperado, real);
}

export function crearSesion(db, usuarioId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sesiones (token, usuario_id) VALUES (?, ?)').run(token, usuarioId);
  return token;
}

export function usuarioPublico(u) {
  if (!u) return null;
  const { password_hash, ...resto } = u;
  return resto;
}

/** Middleware: carga req.usuario a partir del header Authorization: Bearer <token>. */
export function autenticar(db) {
  const buscar = db.prepare(
    `SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = ? AND u.activo = 1`,
  );
  return (req, _res, next) => {
    const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.get('authorization') || '');
    req.usuario = m ? buscar.get(m[1]) || null : null;
    req.token = m ? m[1] : null;
    next();
  };
}

export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
    if (!roles.includes(req.usuario.rol)) return res.status(403).json({ error: 'No tenés permiso para esta acción.' });
    next();
  };
}
