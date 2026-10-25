import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { autenticar } from './auth.js';
import { abrirDB } from './db.js';
import { sembrar } from './seed.js';
import rutasPublicas from './routes/publico.js';
import rutasConductor from './routes/conductor.js';
import rutasTrabajador from './routes/trabajador.js';
import rutasAdmin from './routes/admin.js';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(SERVER_DIR, '..', 'public');

export function crearApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(autenticar(db));
  api.use(rutasPublicas(db));
  api.use('/conductor', rutasConductor(db));
  api.use('/trabajador', rutasTrabajador(db));
  api.use('/admin', rutasAdmin(db));
  api.use((_req, res) => res.status(404).json({ error: 'Ruta inexistente.' }));
  api.use((err, _req, res, _next) => {
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Ocurrió un error inesperado. Intentá de nuevo.' });
  });

  app.use('/api', api);
  // Las reglas de cobro son las mismas en el servidor y en el navegador.
  app.get('/js/reglas.js', (_req, res) => res.type('text/javascript').sendFile(join(SERVER_DIR, 'reglas.js')));
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
  app.get('/{*ruta}', (_req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = abrirDB();
  if (!db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n) {
    sembrar(db);
    console.log('Base de datos nueva: se cargaron datos de demostración.');
  }
  const port = Number(process.env.PORT) || 3000;
  crearApp(db).listen(port, () => console.log(`Estacionamiento Solidario listo en http://localhost:${port}`));
}
