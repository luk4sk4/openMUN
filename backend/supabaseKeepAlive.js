/**
 * supabaseKeepAlive.js
 * 
 * Módulo para prevenir la pausa automática por inactividad de Supabase (Free Tier).
 * Supabase pausa los proyectos tras 7 días de inactividad de API o base de datos.
 * Este script realiza consultas periódicas (por defecto cada 24 horas)
 * al API REST y base de datos de Supabase para mantener el proyecto siempre activo.
 * 
 * Uso:
 * - Importado en server.js: supabaseKeepAlive.startKeepAlive();
 * - Modo script único (cron): node backend/supabaseKeepAlive.js
 * - Modo servicio continuo independiente: node backend/supabaseKeepAlive.js --daemon
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Intentar cargar .env si se ejecuta de forma independiente
try {
  require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
} catch (e) {}

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://przhpubwzwgulaoprnda.supabase.co'
).replace(/\/$/, '');

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_5mjhzXAUOefuSmi8sfHheg_vvaaIlJ_';

const INTERVAL_HOURS = Math.max(1, Number(process.env.SUPABASE_PING_INTERVAL_HOURS) || 24);
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

// Estado en memoria
const state = {
  isRunning: false,
  intervalHours: INTERVAL_HOURS,
  supabaseUrl: SUPABASE_URL,
  lastPingAt: null,
  lastSuccessAt: null,
  lastStatus: null,
  lastError: null,
  isPaused: null,
  pingsCount: 0,
  successCount: 0,
  failureCount: 0,
  history: []
};

let timerId = null;

/**
 * Cliente HTTP ligero sin dependencias externas
 */
function sendRequest(targetUrl, headers = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const transport = parsedUrl.protocol === 'http:' ? http : https;

      const req = transport.request(parsedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'OpenMUN-Supabase-KeepAlive/1.0',
          'Accept': 'application/json',
          ...headers
        },
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => {
          if (body.length < 5000) body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout tras ${timeoutMs}ms contactando ${parsedUrl.hostname}`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Realiza un ping a Supabase para registrar actividad en la base de datos y la API.
 */
async function pingSupabase() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  state.lastPingAt = timestamp;
  state.pingsCount++;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  const results = {
    timestamp,
    supabaseUrl: SUPABASE_URL,
    restRoot: null,
    dbQuery: null,
    authHealth: null,
    ok: false,
    durationMs: 0,
    error: null,
    isPaused: false
  };

  try {
    // 1. Consulta a PostgREST Root (genera actividad de schema/API)
    const restUrl = `${SUPABASE_URL}/rest/v1/`;
    const restRes = await sendRequest(restUrl, headers);
    results.restRoot = { status: restRes.statusCode };

    // 2. Consulta a una tabla para activar el motor PostgreSQL directamente
    // Usamos limit 1 en conferences; aunque devuelva vacío o RLS, toca la BD
    try {
      const tableUrl = `${SUPABASE_URL}/rest/v1/conferences?select=id&limit=1`;
      const tableRes = await sendRequest(tableUrl, headers);
      results.dbQuery = { status: tableRes.statusCode };
    } catch (dbErr) {
      results.dbQuery = { error: dbErr.message };
    }

    // 3. Health check del servicio de autenticación
    try {
      const authUrl = `${SUPABASE_URL}/auth/v1/health`;
      const authRes = await sendRequest(authUrl, headers);
      results.authHealth = { status: authRes.statusCode };
    } catch (authErr) {
      results.authHealth = { error: authErr.message };
    }

    const durationMs = Date.now() - startTime;
    results.durationMs = durationMs;
    results.ok = restRes.statusCode >= 200 && restRes.statusCode < 500;

    state.lastSuccessAt = timestamp;
    state.lastStatus = restRes.statusCode;
    state.lastError = null;
    state.isPaused = false;
    state.successCount++;

    console.log(`[Supabase Keep-Alive] ✅ Ping exitoso (${durationMs}ms) - Status: ${restRes.statusCode}. Próximo ping en ${state.intervalHours}h.`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    results.durationMs = durationMs;
    results.ok = false;
    results.error = err.message;

    // Detectar si el proyecto está pausado (DNS no resuelve)
    const isDnsError = err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND');
    results.isPaused = isDnsError;
    state.isPaused = isDnsError;
    state.lastStatus = err.code || 'ERROR';
    state.lastError = err.message;
    state.failureCount++;

    if (isDnsError) {
      console.warn(`\n[Supabase Keep-Alive] ⚠️ PROYECTO PAUSADO: No se pudo resolver el host "${SUPABASE_URL}".`);
      console.warn(`👉 Para reactivarlo, entra al panel de Supabase y haz clic en "Restore":`);
      console.warn(`   https://supabase.com/dashboard/project/przhpubwzwgulaoprnda\n`);
    } else {
      console.error(`[Supabase Keep-Alive] ❌ Error en ping (${durationMs}ms):`, err.message);
    }
  }

  // Guardar en historial de últimos pings (máximo 10)
  state.history.unshift({
    timestamp,
    ok: results.ok,
    durationMs: results.durationMs,
    status: state.lastStatus,
    error: results.error,
    isPaused: results.isPaused
  });
  if (state.history.length > 10) state.history.pop();

  return results;
}

/**
 * Inicia el cron / intervalo para ejecutar el ping automáticamente.
 */
function startKeepAlive(intervalMs = INTERVAL_MS) {
  if (state.isRunning) return;
  state.isRunning = true;
  state.intervalHours = Math.round(intervalMs / (1000 * 60 * 60));

  console.log(`[Supabase Keep-Alive] Iniciado servicio de mantenimiento de actividad (cada ${state.intervalHours}h).`);

  // Ejecutar el primer ping tras 3 segundos para no bloquear el inicio del servidor
  setTimeout(() => {
    pingSupabase().catch(() => {});
  }, 3000);

  // Configurar intervalo recurrente
  timerId = setInterval(() => {
    pingSupabase().catch(() => {});
  }, intervalMs);

  // Evitar que el timer impida el cierre del proceso si es el único vivo
  if (timerId && typeof timerId.unref === 'function') {
    timerId.unref();
  }
}

/**
 * Detiene el servicio de keep-alive
 */
function stopKeepAlive() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  state.isRunning = false;
  console.log('[Supabase Keep-Alive] Servicio detenido.');
}

/**
 * Retorna el estado actual del servicio
 */
function getStatus() {
  return {
    ...state,
    configuredUrl: SUPABASE_URL,
    configuredIntervalHours: state.intervalHours,
    nextPingEstimated: state.lastPingAt
      ? new Date(new Date(state.lastPingAt).getTime() + (state.intervalHours * 3600 * 1000)).toISOString()
      : null
  };
}

// Ejecución directa por CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--loop') || args.includes('--daemon');

  if (isDaemon) {
    console.log('[Supabase Keep-Alive] Iniciando en modo demonio permanente...');
    startKeepAlive();
    // Mantener proceso vivo
    setInterval(() => {}, 1000 * 60 * 60);
  } else {
    console.log('[Supabase Keep-Alive] Ejecutando comprobación única...');
    pingSupabase().then((res) => {
      console.log('Resultado de la comprobación:', JSON.stringify(res, null, 2));
      process.exit(res.ok ? 0 : 1);
    });
  }
}

module.exports = {
  pingSupabase,
  startKeepAlive,
  stopKeepAlive,
  getStatus
};
