import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_PATH = resolve(process.cwd(), 'data', 'estacionamiento.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  rol           TEXT NOT NULL CHECK (rol IN ('conductor','trabajador','admin')),
  nombre        TEXT NOT NULL,
  dni           TEXT,
  email         TEXT NOT NULL UNIQUE,
  telefono      TEXT,
  password_hash TEXT NOT NULL,
  cooperativa   TEXT,
  legajo        TEXT,
  saldo         INTEGER NOT NULL DEFAULT 0,
  activo        INTEGER NOT NULL DEFAULT 1,
  creado        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token      TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  patente    TEXT NOT NULL,
  alias      TEXT,
  UNIQUE (usuario_id, patente)
);

CREATE TABLE IF NOT EXISTS zonas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  tarifa_hora INTEGER NOT NULL,
  color       TEXT NOT NULL DEFAULT '#0f766e'
);

CREATE TABLE IF NOT EXISTS cuadras (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  zona_id       INTEGER NOT NULL REFERENCES zonas(id),
  codigo        TEXT NOT NULL UNIQUE,
  calle         TEXT NOT NULL,
  desde         INTEGER NOT NULL,
  hasta         INTEGER NOT NULL,
  capacidad     INTEGER NOT NULL DEFAULT 12,
  trabajador_id INTEGER REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS estacionamientos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patente        TEXT NOT NULL,
  cuadra_id      INTEGER NOT NULL REFERENCES cuadras(id),
  conductor_id   INTEGER REFERENCES usuarios(id),
  registrado_por INTEGER REFERENCES usuarios(id),
  trabajador_id  INTEGER REFERENCES usuarios(id),
  medio          TEXT NOT NULL CHECK (medio IN ('app','efectivo')),
  inicio         TEXT NOT NULL,
  fin            TEXT,
  minutos        INTEGER,
  monto          INTEGER,
  tarifa_hora    INTEGER NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','finalizado')),
  rendido        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_est_estado ON estacionamientos(estado);
CREATE INDEX IF NOT EXISTS idx_est_patente ON estacionamientos(patente);
CREATE INDEX IF NOT EXISTS idx_est_inicio ON estacionamientos(inicio);

CREATE TABLE IF NOT EXISTS movimientos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN ('carga','pago','ajuste')),
  monto      INTEGER NOT NULL,
  detalle    TEXT,
  fecha      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS actas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patente       TEXT NOT NULL,
  cuadra_id     INTEGER NOT NULL REFERENCES cuadras(id),
  trabajador_id INTEGER NOT NULL REFERENCES usuarios(id),
  motivo        TEXT NOT NULL,
  observacion   TEXT,
  fecha         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','validada','anulada'))
);

CREATE TABLE IF NOT EXISTS jornadas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  trabajador_id INTEGER NOT NULL REFERENCES usuarios(id),
  cuadra_id     INTEGER NOT NULL REFERENCES cuadras(id),
  inicio        TEXT NOT NULL,
  fin           TEXT
);

CREATE TABLE IF NOT EXISTS parametros (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`;

export const PARAMETROS_DEFAULT = {
  fraccion_minutos: '15',
  minimo_minutos: '30',
  saldo_minimo_inicio: '500',
  horario: 'Lunes a viernes de 8 a 20 h · Sábados de 8 a 13 h',
  // Propuesta de distribución de lo recaudado (porcentajes, suman 100)
  dist_trabajadores: '60',
  dist_municipio: '25',
  dist_fondo_solidario: '10',
  dist_tecnologia: '5',
};

export function abrirDB(path = process.env.DB_PATH || DEFAULT_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrar(db);
  const ins = db.prepare('INSERT OR IGNORE INTO parametros (clave, valor) VALUES (?, ?)');
  for (const [k, v] of Object.entries(PARAMETROS_DEFAULT)) ins.run(k, v);
  return db;
}

// Cambios de esquema para bases creadas con versiones anteriores.
function migrar(db) {
  const columnas = db.prepare('PRAGMA table_info(estacionamientos)').all().map((c) => c.name);
  if (!columnas.includes('trabajador_id')) {
    db.exec('ALTER TABLE estacionamientos ADD COLUMN trabajador_id INTEGER REFERENCES usuarios(id)');
    db.exec(`UPDATE estacionamientos SET trabajador_id = COALESCE(registrado_por, (SELECT trabajador_id FROM cuadras WHERE cuadras.id = estacionamientos.cuadra_id))`);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_est_trabajador ON estacionamientos(trabajador_id)');
  // El legajo es el ID que el conductor/a ingresa al estacionar: no puede repetirse.
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_legajo ON usuarios(legajo) WHERE legajo IS NOT NULL');
}

export function parametros(db) {
  const out = {};
  for (const { clave, valor } of db.prepare('SELECT clave, valor FROM parametros').all()) {
    out[clave] = /^-?\d+$/.test(valor) ? Number(valor) : valor;
  }
  return out;
}

export function transaccion(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
