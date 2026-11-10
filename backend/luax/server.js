require('dotenv').config({ quiet: true });
const express = require('express');
const http = require('node:http');
const cors = require('cors');
const { Server } = require('socket.io');
const { databaseConfig, Pool } = require('./src/config/db');
const { checkReadiness } = require('./src/db/init');
const { cleanup } = require('./src/db/cleanup');
const { createSessions } = require('./src/services/auth');
const { routes } = require('./src/routes');
const { initSockets } = require('./src/sockets');

function createServer(db, env = process.env) {
  const host = env.HOST || '127.0.0.1';
  if (host !== '127.0.0.1') throw new Error('The backend must listen on 127.0.0.1');
  const origins = new Set((env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  if (!origins.size || [...origins].some(origin => {
    const url = new URL(origin);
    return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin;
  })) throw new Error('Set ALLOWED_ORIGINS to exact HTTP origins');
  for (const name of ['BOOTSTRAP_TOKEN', 'PIN_PEPPER']) {
    if (Buffer.byteLength(env[name] || '') < 32) throw new Error(name + ' must be at least 32 bytes');
  }
  const originAllowed = origin => origin === undefined || origins.has(origin);
  const corsOptions = { origin: (origin, callback) => callback(null, originAllowed(origin)) };
  const sessions = createSessions();
  const app = express();
  const server = http.createServer(app);
  let accepting = false;
  let closing = false;

  if (env.TRUST_LOCAL_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!originAllowed(req.get('origin'))) return res.status(403).json({ error: 'Origen no permitido' });
    if (!accepting) return res.status(503).json({ error: 'Servicio no disponible' });
    next();
  });
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '256kb' }));
  app.get('/readyz', async (_req, res) => {
    try {
      await checkReadiness(db);
      res.json({ ready: true });
    } catch (error) {
      console.error('Readiness check failed:', error.code || error.name);
      res.status(503).json({ ready: false });
    }
  });
  app.use('/api', routes(db, sessions, { bootstrapToken: env.BOOTSTRAP_TOKEN, pepper: env.PIN_PEPPER }));
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.code === '23505' ? 409 : error.status || 500;
    if (status >= 500) console.error('HTTP operation failed:', error.code || error.name);
    const messages = { 400: 'Solicitud inválida', 409: 'Conflicto', 413: 'Solicitud demasiado grande' };
    res.status(status).json({ error: messages[status] || (status < 500 ? error.message : 'Error interno') });
  });

  const io = new Server(server, {
    cors: corsOptions,
    allowRequest: (req, callback) => callback(null, accepting && originAllowed(req.headers.origin)),
    perMessageDeflate: false,
    maxHttpBufferSize: 256 * 1024
  });
  const drain = initSockets(io, db, sessions, () => accepting);

  return {
    async start(port = Number(env.PORT || 3005)) {
      await checkReadiness(db);
      if (closing) throw new Error('OpenMUN is shutting down');
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          accepting = true;
          resolve();
        });
      });
      return server.address();
    },
    async close() {
      closing = true;
      accepting = false;
      await drain();
      await io.close();
    }
  };
}

if (require.main === module) {
  const db = new Pool(databaseConfig());
  const server = createServer(db);
  let stopping = false;
  let cleanupTimer;
  let cleaning;
  function runCleanup() {
    if (cleaning) return;
    cleaning = cleanup(db).then(result => {
      if (result.messages || result.conferences) console.log('Retention cleanup:', result);
    }).catch(error => {
      console.error('Retention cleanup failed:', error.code || error.name);
    }).finally(() => { cleaning = null; });
  }
  async function stop() {
    if (stopping) return;
    stopping = true;
    clearInterval(cleanupTimer);
    try {
      await server.close();
      await cleaning;
    } finally {
      await db.end();
    }
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => stop().catch(() => { process.exitCode = 1; }));
  }
  server.start().then(({ address, port }) => {
    console.log('OpenMUN listening on ' + address + ':' + port);
    if (!stopping) {
      cleanupTimer = setInterval(runCleanup, 60 * 60 * 1000);
      runCleanup();
    }
  }).catch(error => {
    console.error('OpenMUN startup failed:', error.code || error.message);
    process.exitCode = 1;
    return db.end();
  });
}

module.exports = { createServer };
