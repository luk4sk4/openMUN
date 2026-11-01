require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');
const db = require('./db.js');
const { hashPin, verifyPin, publicState, createSecurity, removeStoredCredentials } = require('./security.js');
const security = createSecurity(db);
for (const conf of db.prepare('SELECT id, pin_admin, pin_acceso FROM conferencias').all()) {
  db.prepare('UPDATE conferencias SET pin_admin = ?, pin_acceso = ? WHERE id = ?').run(hashPin(conf.pin_admin), hashPin(conf.pin_acceso), conf.id);
}
for (const com of db.prepare('SELECT id, pin_mesa, datos_json FROM comites').all()) {
  db.prepare('UPDATE comites SET pin_mesa = ? WHERE id = ?').run(hashPin(com.pin_mesa), com.id);
  try {
    const state = JSON.parse(com.datos_json);
    if (state && typeof state === 'object' && !Array.isArray(state)) db.prepare('UPDATE comites SET datos_json = ? WHERE id = ?').run(JSON.stringify(removeStoredCredentials(state)), com.id);
  } catch { /* Keep an invalid legacy snapshot intact for manual recovery. */ }
}
const app = express();
const server = http.createServer(app);
const nodemailer = require('nodemailer');
const supabaseKeepAlive = require('./supabaseKeepAlive.js');
// Middlewares
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean) : ['https://openmun.app', 'http://localhost:5173', 'http://localhost:4173'], exposedHeaders: ['X-OpenMUN-Session'] }));
app.use(express.json({ limit: '25mb' }));
const attempts = new Map();
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    const now = Date.now();
    const key = req.ip;
    const entry = attempts.get(key);
    const current = entry && now - entry.start < 60000 ? entry : { start: now, count: 0 };
    attempts.set(key, current);
    const isLogin = req.path.endsWith('/acceso') || req.body?.pin_admin_actual;
    if (isLogin && ++current.count > 20) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
  }
  next();
});
setInterval(() => { for (const [key, value] of attempts) if (Date.now() - value.start > 60000) attempts.delete(key); }, 60000).unref();
app.use(security.middleware);
// Configuración SMTP para respaldos por correo
const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = smtpConfigured ? nodemailer.createTransport({
	host: process.env.SMTP_HOST || 'smtp.protonmail.ch',
	port: Number(process.env.SMTP_PORT) || 587,
	secure: process.env.SMTP_SECURE === 'true', // STARTTLS por defecto si false
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS
	},
	tls: {
		rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
	}
}) : null;

if (transporter) {
	transporter.verify((error, success) => {
		if (error) {
			console.error('Error de conexión SMTP:', error.message);
		} else {
			console.log('Servidor SMTP listo para enviar respaldos.');
		}
	});
} else {
	console.log('Servidor SMTP no configurado (SMTP_USER y SMTP_PASS no definidos). Respaldos automáticos por correo desactivados.');
}

// Configuración de Socket.io
const io = new Server(server, {
	cors: {
		origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean) : ['https://openmun.app', 'http://localhost:5173', 'http://localhost:4173'],
		credentials: true
	},
	perMessageDeflate: true,
  maxHttpBufferSize: 1024 * 1024
});

// Panel de control (@socket.io/admin-ui)
if (process.env.SOCKET_ADMIN_PASSWORD_HASH) {
	instrument(io, {
		auth: {
			type: "basic",
			username: process.env.SOCKET_ADMIN_USER || "admin",
			password: process.env.SOCKET_ADMIN_PASSWORD_HASH
		}
	});
}
// ==========================================
// CONSULTAS PREPARADAS SQLITE
// ==========================================
const qInsertConferencia = db.prepare(`
  INSERT INTO conferencias (id, nombre, pin_admin, pin_acceso, email_admin)
  VALUES (@id, @nombre, @pin_admin, @pin_acceso, @email_admin)
`);
const qGetConferencia = db.prepare(`SELECT * FROM conferencias WHERE id = ?`);
const qUpdateConferencia = db.prepare(`
  UPDATE conferencias 
  SET nombre = @nombre,
      pin_admin = @pin_admin,
      pin_acceso = @pin_acceso,
      email_admin = @email_admin,
      ultimo_cambio = CURRENT_TIMESTAMP
  WHERE id = @id
`);
const qTouchConferencia = db.prepare(`
  UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = ?
`);
const qGetComitesResumen = db.prepare(`
  SELECT id, conferencia_id, nombre, pin_mesa, tipo_sesion, topico_actual, datos_json, actualizado_en 
  FROM comites 
  WHERE conferencia_id = ?
`);
const qGetComite = db.prepare(`SELECT * FROM comites WHERE id = ?`);
const qUpsertComite = db.prepare(`
  INSERT INTO comites (id, conferencia_id, nombre, pin_mesa, datos_json, actualizado_en)
  VALUES (@id, @conferencia_id, @nombre, @pin_mesa, @datos_json, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    nombre = COALESCE(excluded.nombre, comites.nombre),
    pin_mesa = CASE WHEN @actualizar_pin THEN excluded.pin_mesa ELSE comites.pin_mesa END,
    datos_json = excluded.datos_json,
    actualizado_en = CURRENT_TIMESTAMP
`);
const qUpdateComiteCompleto = db.prepare(`
  UPDATE comites 
  SET nombre = @nombre,
      pin_mesa = @pin_mesa,
      tipo_sesion = @tipo_sesion,
      topico_actual = @topico_actual,
      datos_json = @datos_json,
      actualizado_en = CURRENT_TIMESTAMP
  WHERE id = @id
`);
const qUpdateComiteEstado = db.prepare(`
  UPDATE comites 
  SET tipo_sesion = COALESCE(?, tipo_sesion),
      topico_actual = COALESCE(?, topico_actual),
      actualizado_en = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const qDeleteComite = db.prepare(`DELETE FROM comites WHERE id = ?`);
// Avisos
const qInsertAviso = db.prepare(`
  INSERT INTO avisos (conferencia_id, comite_id, emisor, tipo, mensaje, creado_por)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const qGetAvisosActivos = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosChairConComite = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND (
      comite_id IS NULL 
      OR comite_id = '' 
      OR UPPER(comite_id) IN ('GLOBAL', 'ALL', 'TODOS')
      OR UPPER(comite_id) IN ('CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL')
      OR LOWER(comite_id) = LOWER(?)
      OR LOWER(comite_id) = ('comite_' || LOWER(?))
      OR LOWER(comite_id) = ('chair_' || LOWER(?))
      OR LOWER(comite_id) = ('mesa_' || LOWER(?))
    )
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosChairSinComite = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND (
      comite_id IS NULL 
      OR comite_id = '' 
      OR UPPER(comite_id) IN ('GLOBAL', 'ALL', 'TODOS')
      OR UPPER(comite_id) IN ('CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL')
    )
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosStaffConComite = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND (
      comite_id IS NULL 
      OR comite_id = '' 
      OR UPPER(comite_id) IN ('GLOBAL', 'ALL', 'TODOS')
      OR UPPER(comite_id) IN ('STAFF_ALL', 'STAFF_GLOBAL')
      OR LOWER(comite_id) = LOWER(?)
      OR LOWER(comite_id) = ('comite_' || LOWER(?))
      OR LOWER(comite_id) = ('staff_comite_' || LOWER(?))
      OR LOWER(comite_id) = ('staff_' || LOWER(?))
    )
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosStaffGlobales = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND (
      comite_id IS NULL 
      OR comite_id = '' 
      OR UPPER(comite_id) IN ('GLOBAL', 'ALL', 'TODOS')
      OR UPPER(comite_id) IN ('STAFF_ALL', 'STAFF_GLOBAL')
      OR comite_id LIKE 'STAFF_%'
    )
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosDelegateConComite = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND (
      comite_id IS NULL 
      OR comite_id = '' 
      OR UPPER(comite_id) IN ('GLOBAL', 'ALL', 'TODOS')
      OR LOWER(comite_id) = LOWER(?)
      OR LOWER(comite_id) = ('comite_' || LOWER(?))
    )
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosDelegateGlobales = db.prepare(`
  SELECT id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND (
      comite_id IS NULL 
      OR comite_id = '' 
      OR UPPER(comite_id) IN ('GLOBAL', 'ALL', 'TODOS')
    )
    AND creado_en >= datetime('now', '-24 hours')
  ORDER BY creado_en DESC
`);
const qGetAvisosPorComite = qGetAvisosChairConComite;
const qGetAvisosPorStaff = qGetAvisosStaffConComite;
const qGetAvisosStaffAll = qGetAvisosStaffGlobales;
const qDesactivarAviso = db.prepare(`UPDATE avisos SET activo = 0 WHERE id = ?`);
const qLimpiarAvisosViejos = db.prepare(`
  DELETE FROM avisos 
  WHERE creado_en < datetime('now', '-24 hours') 
     OR activo = 0
`);
// Checklist Staff
const qGetChecklistAll = db.prepare(`
  SELECT * FROM checklist_staff 
  WHERE conferencia_id = ? 
  ORDER BY completado ASC, creado_en DESC
`);
const qGetChecklistPorComite = db.prepare(`
  SELECT * FROM checklist_staff 
  WHERE conferencia_id = ? 
    AND (comite_id IS NULL OR comite_id = '' OR comite_id = 'GLOBAL' OR comite_id = ?)
  ORDER BY completado ASC, creado_en DESC
`);
const qGetChecklistGlobal = db.prepare(`
  SELECT * FROM checklist_staff 
  WHERE conferencia_id = ? 
    AND (comite_id IS NULL OR comite_id = '' OR comite_id = 'GLOBAL')
  ORDER BY completado ASC, creado_en DESC
`);
const qInsertChecklistItem = db.prepare(`
  INSERT INTO checklist_staff (conferencia_id, comite_id, titulo, asignado_a)
  VALUES (?, ?, ?, ?)
`);
const qToggleChecklistItem = db.prepare(`
  UPDATE checklist_staff 
  SET completado = ? 
  WHERE id = ?
`);
const qDeleteChecklistItem = db.prepare(`
  DELETE FROM checklist_staff WHERE id = ?
`);
const qDeleteCompletadosAll = db.prepare(`
  DELETE FROM checklist_staff 
  WHERE conferencia_id = ? 
    AND completado = 1
`);
const qDeleteCompletadosPorComite = db.prepare(`
  DELETE FROM checklist_staff 
  WHERE conferencia_id = ? 
    AND completado = 1
    AND comite_id = ?
`);
const qDeleteCompletadosGlobal = db.prepare(`
  DELETE FROM checklist_staff 
  WHERE conferencia_id = ? 
    AND completado = 1
    AND (comite_id IS NULL OR comite_id = '' OR comite_id = 'GLOBAL')
`);
// Auto-limpieza de conferencias inactivas
const qGetConferenciasInactivas = db.prepare(`
  SELECT * FROM conferencias 
  WHERE ultimo_cambio < datetime('now', '-30 days')
`);
const qGetComitesDeConf = db.prepare(`
  SELECT id, nombre, pin_mesa, tipo_sesion, topico_actual, datos_json, actualizado_en 
  FROM comites 
  WHERE conferencia_id = ?
`);
const qDeleteConferencia = db.prepare(`
  DELETE FROM conferencias WHERE id = ? AND ultimo_cambio < datetime('now', '-30 days')
`);
// Helper para parsear comités
function mapearComites(rawList, identity) {
        return (rawList || []).map(c => {
                let parsedDatos = c.datos_json;
                if (typeof parsedDatos === 'string') {
                        try { parsedDatos = JSON.parse(parsedDatos); } catch (e) { parsedDatos = {}; }
                }
                return {
                        id: c.id, conferencia_id: c.conferencia_id, nombre: c.nombre, tipo_sesion: c.tipo_sesion, topico_actual: c.topico_actual, actualizado_en: c.actualizado_en,
                        requierePinMesa: Boolean(c.pin_mesa),
                        datos_json: identity?.role === 'secretariat' || (identity?.role === 'chair' && identity.comiteId === c.id) ? parsedDatos || {} : publicState(parsedDatos)
                };
        });
}
// ==========================================
// AUTO-LIMPIEZA Y RESPALDO (30 DÍAS)
// ==========================================
async function limpiarConferenciasInactivas(mailTransport = transporter) {
        try {
                const inactivas = qGetConferenciasInactivas.all();
                if (inactivas.length === 0) return;
                for (const conf of inactivas) {
                        console.log(`[Auto-Limpieza] Archivando conferencia: ${conf.nombre} (${conf.id})`);
                        const comites = qGetComitesDeConf.all(conf.id);
                        if (!conf.email_admin || !mailTransport) {
                          console.warn(`[Auto-Limpieza] ${conf.id}: conservada sin respaldo confirmado.`);
                          continue;
                        }
                        if (conf.email_admin) {
                                const backupData = JSON.stringify({
                                        conferencia: {
                                                id: conf.id,
                                                nombre: conf.nombre,
                                                creado_en: conf.creado_en
                                        },
                                        comites: comites.map(c => {
                                                let d = {};
                                                try { d = typeof c.datos_json === 'string' ? JSON.parse(c.datos_json) : (c.datos_json || {}); } catch (e) { }
                                                return {
                                                        id: c.id,
                                                        nombre: c.nombre,
                                                        pin_mesa: c.pin_mesa,
                                                        tipo_sesion: c.tipo_sesion,
                                                        topico_actual: c.topico_actual,
                                                        datos: d
                                                };
                                        })
                                }, null, 2);
                                if (mailTransport) {
					try {
						await mailTransport.sendMail({
							from: process.env.SMTP_FROM || `"OpenMUN" <${process.env.SMTP_USER}>`,
							to: conf.email_admin,
							subject: `Respaldo y Cierre por Inactividad: ${conf.nombre}`,
							text: `Hola,\n\nTu conferencia "${conf.nombre}" ha superado los 30 días sin actividad y ha sido archivada.\n\nTe adjuntamos el archivo de respaldo completo.\n\nAtentamente,\nEl equipo de OpenMUN.`,
							attachments: [
								{
									filename: `backup_${conf.id}.json`,
									content: backupData,
									contentType: 'application/json'
								}
							]
						});
					} catch (emailErr) {
						console.error(`[Auto-Limpieza] Error enviando email a ${conf.email_admin}:`, emailErr.message);
                        continue;
					}
				}
                        }
                        qDeleteConferencia.run(conf.id);
                }
        } catch (err) {
                console.error('[Auto-Limpieza] Error:', err.message);
        }
}
setInterval(limpiarConferenciasInactivas, 24 * 60 * 60 * 1000).unref();
limpiarConferenciasInactivas();
setInterval(() => {
        try {
                qLimpiarAvisosViejos.run();
        } catch (err) {
                console.error('Error limpiando avisos antiguos:', err.message);
        }
}, 60 * 60 * 1000).unref();
// Supabase Keep-Alive: prevención de pausa por inactividad del free-tier (7 días)
if (process.env.SUPABASE_KEEPALIVE_ENABLED !== 'false') supabaseKeepAlive.startKeepAlive();

// ==========================================
// ENDPOINTS REST API
// ==========================================
// 0. Supabase Keep-Alive Status & Ping manual
app.get('/api/supabase/status', (req, res) => {
	res.json(supabaseKeepAlive.getStatus());
});
app.get('/api/supabase/ping', async (req, res) => {
	try {
		const resultado = await supabaseKeepAlive.pingSupabase();
		res.json(resultado);
	} catch (err) {
		res.status(500).json({ ok: false, error: err.message });
	}
});

// 1. Crear Conferencia
app.post('/api/conferencias', (req, res) => {
        const { id, nombre, pin_admin, pin_acceso, email_admin } = req.body;
        if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{3,80}$/.test(id) || typeof nombre !== 'string' || !nombre.trim() || nombre.length > 200 || typeof pin_admin !== 'string' || pin_admin.trim().length < 4 || pin_admin.length > 128) {
                return res.status(400).json({ error: 'Se requiere un ID válido, nombre y un PIN de al menos 4 caracteres.' });
        }
        try {
                qInsertConferencia.run({
                        id: id.toLowerCase().trim(),
                        nombre: nombre.trim(),
                        pin_admin: hashPin(pin_admin.toString().trim()),
                        pin_acceso: hashPin(pin_acceso ? pin_acceso.toString().trim() : null),
                        email_admin: email_admin ? email_admin.toString().trim() : null
                });
                res.json({ ok: true, mensaje: 'Conferencia creada exitosamente' });
        } catch (err) {
                if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                        return res.status(409).json({ error: 'El ID de la conferencia ya existe' });
                }
                res.status(500).json({ error: err.message });
        }
});
// 2. Acceso a Conferencia
app.post('/api/conferencias/:id/acceso', (req, res) => {
        const confId = req.params.id.toLowerCase().trim();
        const conf = qGetConferencia.get(confId);
        if (!conf) return res.status(404).json({ error: 'Conferencia no encontrada' });
        const { pin } = req.body;
        const pinRecibido = pin ? pin.toString().trim() : '';
        if (conf.pin_acceso && !verifyPin(pinRecibido, conf.pin_acceso)) {
                return res.status(401).json({ error: 'PIN de acceso incorrecto' });
        }
        const rawComites = qGetComitesResumen.all(conf.id);
        res.json({
                id: conf.id,
                nombre: conf.nombre,
                ...(req.identity?.role === 'secretariat' ? { email_admin: conf.email_admin } : {}),
                requierePin: Boolean(conf.pin_acceso),
                comites: mapearComites(rawComites, req.identity)
        });
});
// 3. Resumen de Conferencia (Dashboard Secretaría)
app.get('/api/conferencias/:id/resumen', (req, res) => {
        const confId = req.params.id.toLowerCase().trim();
        const conf = qGetConferencia.get(confId);
        if (!conf) return res.status(404).json({ error: 'Conferencia no encontrada' });
        const rawComites = qGetComitesResumen.all(confId);
        res.json({
                id: conf.id,
                nombre: conf.nombre,
                ...(req.identity?.role === 'secretariat' ? { email_admin: conf.email_admin } : {}),
                requierePin: Boolean(conf.pin_acceso),
                comites: mapearComites(rawComites, req.identity)
        });
});
// 4. Actualizar Conferencia
app.patch('/api/conferencias/:id', (req, res) => {
        const confId = req.params.id.toLowerCase().trim();
        const { pin_admin_actual, nombre, nuevo_pin_admin, pin_acceso, email_admin } = req.body;
        if (!pin_admin_actual) {
                return res.status(400).json({ error: 'Se requiere el pin_admin_actual para realizar cambios' });
        }
        const conf = qGetConferencia.get(confId);
        if (!conf) return res.status(404).json({ error: 'Conferencia no encontrada' });
        if (!verifyPin(pin_admin_actual.toString().trim(), conf.pin_admin)) {
                return res.status(401).json({ error: 'PIN de administración incorrecto' });
        }
        try {
                const finalNombre = nombre !== undefined ? (nombre ? nombre.trim() : conf.nombre) : conf.nombre;
                const finalPinAdmin = nuevo_pin_admin !== undefined ? (nuevo_pin_admin ? nuevo_pin_admin.toString().trim() : conf.pin_admin) : conf.pin_admin;
                const finalPinAcceso = pin_acceso !== undefined ? (pin_acceso ? pin_acceso.toString().trim() : null) : conf.pin_acceso;
                const finalEmail = email_admin !== undefined ? (email_admin ? email_admin.toString().trim() : null) : conf.email_admin;
                qUpdateConferencia.run({
                        id: confId,
                        nombre: finalNombre,
                        pin_admin: hashPin(finalPinAdmin),
                        pin_acceso: hashPin(finalPinAcceso),
                        email_admin: finalEmail
                });
                res.json({ ok: true, mensaje: 'Conferencia actualizada correctamente' });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 5. Crear o guardar Comité completo
app.post('/api/conferencias/:id/comites', (req, res) => {
        const conferencia_id = req.params.id.toLowerCase().trim();
        const { id, nombre, pin_mesa, datos_json } = req.body;
        const comiteId = id ? id.toLowerCase().trim() : `${conferencia_id}_${Date.now()}`;
        const existing = qGetComite.get(comiteId);
        if (existing && existing.conferencia_id !== conferencia_id) return res.status(403).json({ error: 'El comité pertenece a otra conferencia.' });
        const jsonStr = typeof datos_json === 'object' ? JSON.stringify(datos_json) : (datos_json || '{}');
        try {
                qUpsertComite.run({
                        id: comiteId,
                        conferencia_id,
                        nombre: nombre ? nombre.trim() : 'Comité sin nombre',
                        pin_mesa: hashPin(pin_mesa ? pin_mesa.toString().trim() : null),
                        actualizar_pin: pin_mesa !== undefined ? 1 : 0,
                        datos_json: jsonStr
                });
                qTouchConferencia.run(conferencia_id);
                res.json({ ok: true, comiteId });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 6. Obtener datos completos de un comité específico
app.get('/api/comites/:id', (req, res) => {
        const comiteId = req.params.id.toLowerCase().trim();
        try {
                const comite = qGetComite.get(comiteId);
                if (!comite) {
                        return res.status(404).json({ error: 'Comité no encontrado' });
                }
                let parsedDatos = comite.datos_json;
                if (typeof parsedDatos === 'string') {
                        try { parsedDatos = JSON.parse(parsedDatos); } catch (e) { parsedDatos = {}; }
                }
                res.json({
                        ...mapearComites([comite], req.identity)[0],
                        requierePinMesa: Boolean(comite.pin_mesa),
                        datos_json: req.identity?.role === 'secretariat' || req.identity?.role === 'chair' ? parsedDatos || {} : publicState(parsedDatos)
                });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 7. Acceso a Comité (Validación de PIN de Mesa Directiva)
app.post('/api/comites/:id/acceso', (req, res) => {
        const comiteId = req.params.id.toLowerCase().trim();
        try {
                const comite = qGetComite.get(comiteId);
                if (!comite) return res.status(404).json({ error: 'Comité no encontrado' });
                const { pin } = req.body;
                const pinRecibido = pin ? pin.toString().trim() : '';
                if (req.identity.role !== 'secretariat' && comite.pin_mesa && !verifyPin(pinRecibido, comite.pin_mesa)) {
                        return res.status(401).json({ error: 'PIN de Mesa Directiva incorrecto' });
                }
                let parsedDatos = comite.datos_json;
                if (typeof parsedDatos === 'string') {
                        try { parsedDatos = JSON.parse(parsedDatos); } catch (e) { parsedDatos = {}; }
                }
                res.json({
                        ok: true,
                        id: comite.id,
                        nombre: comite.nombre,
                        requierePinMesa: Boolean(comite.pin_mesa),
                        datos_json: req.identity?.role === 'secretariat' || req.identity?.role === 'chair' ? parsedDatos || {} : publicState(parsedDatos)
                });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 8. Actualizar comité
app.patch('/api/comites/:id', (req, res) => {
        const comiteId = req.params.id.toLowerCase().trim();
        const { nombre, pin_mesa, tipo_sesion, topico_actual, datos_json } = req.body;
        const comite = qGetComite.get(comiteId);
        if (!comite) {
                return res.status(404).json({ error: 'Comité no encontrado' });
        }
        let finalDatosJson = comite.datos_json;
        if (datos_json !== undefined) {
                finalDatosJson = typeof datos_json === 'object' ? JSON.stringify(datos_json) : (datos_json || '{}');
        }
        const finalNombre = nombre !== undefined ? (nombre ? nombre.trim() : comite.nombre) : comite.nombre;
        const finalPin = pin_mesa !== undefined ? (pin_mesa ? pin_mesa.toString().trim() : null) : comite.pin_mesa;
        const finalTipo = tipo_sesion !== undefined ? tipo_sesion : comite.tipo_sesion;
        const finalTopico = topico_actual !== undefined ? (topico_actual ? topico_actual.trim() : '') : comite.topico_actual;
        try {
                qUpdateComiteCompleto.run({
                        id: comiteId,
                        nombre: finalNombre,
                        pin_mesa: hashPin(finalPin),
                        tipo_sesion: finalTipo,
                        topico_actual: finalTopico,
                        datos_json: finalDatosJson
                });
                if (comite.conferencia_id) {
                        qTouchConferencia.run(comite.conferencia_id);
                }
                res.json({ ok: true, mensaje: 'Comité actualizado correctamente' });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 9. Estado de comité rápido
app.patch('/api/comites/:id/estado', (req, res) => {
        const comiteId = req.params.id.toLowerCase().trim();
        const { tipo_sesion, topico_actual } = req.body;
        try {
                qUpdateComiteEstado.run(tipo_sesion || null, topico_actual || null, comiteId);
                res.json({ ok: true });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 10. Eliminar un comité
app.delete('/api/comites/:id', (req, res) => {
        const comiteId = req.params.id.toLowerCase().trim();
        try {
                const comite = qGetComite.get(comiteId);
                const info = qDeleteComite.run(comiteId);
                if (comite?.conferencia_id) {
                        qTouchConferencia.run(comite.conferencia_id);
                }
                res.json({ ok: true, eliminados: info.changes });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 11. Eliminar comité con ruta padre (fallback)
app.delete('/api/conferencias/:conferencia_id/comites/:id', (req, res) => {
        const comiteId = req.params.id.toLowerCase().trim();
        const confId = req.params.conferencia_id.toLowerCase().trim();
        try {
                const existing = qGetComite.get(comiteId);
                if (existing?.conferencia_id !== confId) return res.status(404).json({ error: 'Comité no encontrado en esta conferencia.' });
                const info = qDeleteComite.run(comiteId);
                qTouchConferencia.run(confId);
                res.json({ ok: true, eliminados: info.changes });
        } catch (err) {
                res.status(500).json({ error: err.message });
        }
});
// 12. Avisos
app.post('/api/conferencias/:id/avisos', (req, res) => {
	const confId = req.params.id.toLowerCase().trim();
	const { comite_id, emisor, tipo, mensaje } = req.body;
	if (!mensaje || !mensaje.trim()) {
		return res.status(400).json({ error: 'El mensaje es obligatorio' });
	}
	try {
		const targetComite = comite_id ? comite_id.trim() : null;
		const emisorNombre = req.identity.role === 'secretariat' ? (emisor ? emisor.trim() : 'Organización') : `${req.identity.role} (${req.identity.comiteId || confId})`;
		const tipoAviso = tipo || 'info';
		const textoMensaje = mensaje.trim();

		const info = qInsertAviso.run(
			confId,
			targetComite,
			emisorNombre,
			tipoAviso,
			textoMensaje,
      `${req.identity.role}:${req.identity.comiteId || ''}`
		);

		const nuevoAviso = {
			id: info.lastInsertRowid,
			conferencia_id: confId,
			comite_id: targetComite,
			emisor: emisorNombre,
			tipo: tipoAviso,
			mensaje: textoMensaje,
			creado_en: new Date().toISOString()
		};

		// Broadcast en tiempo real por Socket.io
		for (const peer of io.sockets.sockets.values()) {
      const identity = peer.data.identity;
      if (identity?.confId === confId && avisoCorrespondeBackend(nuevoAviso, identity.role === 'secretariat' ? 'secretaria' : identity.role, identity.comiteId)) peer.emit('nuevo-aviso', nuevoAviso);
    }
		res.json({ ok: true, id: info.lastInsertRowid, aviso: nuevoAviso });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

function normalizarComiteIdBackend(id) {
	if (!id) return '';
	let str = String(id).trim().toLowerCase();
	let prev;
	do {
		prev = str;
		str = str
			.replace(/^(chair|mesa|staff_comite|staff|comite)[\s_-]+/i, '')
			.replace(/^(comite|mesa)[\s_-]*/i, '');
	} while (str !== prev && str.length > 0);
	return str;
}

function avisoCorrespondeBackend(aviso, role, currentComiteId, comites = [], currentComiteNombre = null) {
	if (!aviso) return false;
	const userRole = String(role || 'staff').trim().toLowerCase();

	if (userRole === 'secretaria' || userRole === 'organizacion' || userRole === 'admin') {
		return true;
	}

	const rawDestino = aviso.comite_id ? String(aviso.comite_id).trim() : '';
	const destinoUpper = rawDestino.toUpperCase();

	// Globales
	if (!rawDestino || ['GLOBAL', 'ALL', 'TODOS'].includes(destinoUpper)) {
		return true;
	}

	const normCurrent = normalizarComiteIdBackend(currentComiteId);
	const normNombre = normalizarComiteIdBackend(currentComiteNombre);
	const rawCurrent = currentComiteId ? String(currentComiteId).trim().toLowerCase() : '';

	// Buscar comité coincidente en la lista de comités de la conferencia
	const matchingComite = (comites || []).find(c => {
		if (!c) return false;
		const cid = String(c.id || '').trim().toLowerCase();
		const cnom = String(c.nombre || '').trim().toLowerCase();
		const normCid = normalizarComiteIdBackend(c.id);
		const normCnom = normalizarComiteIdBackend(c.nombre);
		return (
			(rawCurrent && cid === rawCurrent) ||
			(normCurrent && normCid === normCurrent) ||
			(normCurrent && normCnom === normCurrent) ||
			(normNombre && normCnom === normNombre) ||
			(normNombre && normCid === normNombre)
		);
	});

	const matchingIdNorm = matchingComite ? normalizarComiteIdBackend(matchingComite.id) : null;
	const matchingNomNorm = matchingComite ? normalizarComiteIdBackend(matchingComite.nombre) : null;
	const matchingRawId = matchingComite ? String(matchingComite.id).trim().toLowerCase() : null;

	const coincideComite = (normTarget, rawTarget) => {
		if (!normTarget && !rawTarget) return false;
		const cleanTarget = (normTarget || '').toLowerCase();
		const cleanRaw = (rawTarget || '').toLowerCase();

		// 1. Coincidencia directa con ID o Nombre actual (bidireccional)
		if (normCurrent && (cleanTarget === normCurrent || cleanRaw === rawCurrent || cleanRaw.endsWith(rawCurrent) || rawCurrent.endsWith(cleanRaw))) return true;
		if (rawCurrent && (cleanRaw === rawCurrent || cleanRaw.endsWith(rawCurrent) || rawCurrent.endsWith(cleanRaw))) return true;
		if (normNombre && (cleanTarget === normNombre || cleanRaw === normNombre || cleanRaw.includes(normNombre) || normNombre.includes(cleanTarget) || cleanTarget.includes(normNombre))) return true;

		// 2. Coincidencia con datos de comité coincidente en la lista
		if (matchingIdNorm && (cleanTarget === matchingIdNorm || cleanRaw === matchingRawId || cleanRaw.endsWith(matchingRawId) || matchingRawId.endsWith(cleanRaw))) return true;
		if (matchingNomNorm && (cleanTarget === matchingNomNorm || cleanRaw === matchingNomNorm || cleanRaw.includes(matchingNomNorm) || matchingNomNorm.includes(cleanTarget))) return true;
		if (matchingRawId && (cleanRaw === matchingRawId || cleanRaw.endsWith(matchingRawId) || matchingRawId.endsWith(cleanRaw))) return true;

		// 3. Búsqueda directa del comité objetivo en la lista
		const targetComiteObj = (comites || []).find(c => {
			if (!c) return false;
			const cid = String(c.id || '').trim().toLowerCase();
			const cnom = String(c.nombre || '').trim().toLowerCase();
			const nCid = normalizarComiteIdBackend(c.id);
			const nCnom = normalizarComiteIdBackend(c.nombre);
			return cleanTarget === cid || cleanTarget === nCid || cleanRaw === cid || cleanTarget === cnom || cleanTarget === nCnom || cleanRaw === cnom;
		});

		if (targetComiteObj) {
			const tid = String(targetComiteObj.id || '').trim().toLowerCase();
			const tnom = String(targetComiteObj.nombre || '').trim().toLowerCase();
			const nTid = normalizarComiteIdBackend(targetComiteObj.id);
			const nTnom = normalizarComiteIdBackend(targetComiteObj.nombre);
			if (rawCurrent && (rawCurrent === tid || rawCurrent.endsWith(tid) || tid.endsWith(rawCurrent))) return true;
			if (normCurrent && (normCurrent === nTid || normCurrent === nTnom)) return true;
			if (normNombre && (normNombre === nTnom || normNombre === nTid)) return true;
		}

		return false;
	};

	// CHAIR / MESA DIRECTIVA
	if (userRole === 'chair' || userRole === 'mesa' || userRole === 'secretariat' || userRole === 'dais') {
		if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL', 'CHAIR_LOCAL'].includes(destinoUpper)) {
			return true;
		}
		if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper.startsWith('STAFF_') || destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') {
			return false;
		}
		if ((!normCurrent && !normNombre) || normCurrent === 'todos') {
			return false;
		}
		if (destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_')) {
			const targetMesa = normalizarComiteIdBackend(destinoUpper);
			const rawTarget = rawDestino.replace(/^(chair_|mesa_)/i, '');
			return coincideComite(targetMesa, rawTarget);
		}
		const targetComite = normalizarComiteIdBackend(destinoUpper);
		return coincideComite(targetComite, rawDestino);
	}

	// STAFF
	if (userRole === 'staff' || userRole === 'staff_global') {
		if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper === 'STAFF_LOCAL') {
			return true;
		}
		if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL', 'CHAIR_LOCAL'].includes(destinoUpper) ||
			destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_') ||
			destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') {
			return false;
		}
		if (destinoUpper.startsWith('STAFF_COMITE_') || destinoUpper.startsWith('STAFF_')) {
			const targetStaffComite = normalizarComiteIdBackend(destinoUpper);
			const rawTarget = rawDestino.replace(/^(staff_comite_|staff_)/i, '');
			// El staff de conferencia (global) o sin sala fija NO debe ver los mensajes internos dirigidos a staff de comités individuales
			if ((!normCurrent && !normNombre) || normCurrent === 'todos' || userRole === 'staff_global') {
				return false;
			}
			return coincideComite(targetStaffComite, rawTarget);
		}
		if ((!normCurrent && !normNombre) || normCurrent === 'todos') {
			return false;
		}
		const targetComite = normalizarComiteIdBackend(destinoUpper);
		return coincideComite(targetComite, rawDestino);
	}

	// DELEGATE
	if (userRole === 'delegate') {
		if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper.startsWith('STAFF_')) return false;
		if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL'].includes(destinoUpper) ||
			destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_')) return false;
		if (destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') return false;

		if ((normCurrent || normNombre) && normCurrent !== 'todos') {
			const targetComite = normalizarComiteIdBackend(destinoUpper);
			return coincideComite(targetComite, rawDestino);
		}
		return false;
	}

	return false;
}

app.get('/api/conferencias/:id/avisos', (req, res) => {
	const confId = req.params.id.toLowerCase().trim();
	const { comite_id, role, rol, todos, comite_nombre } = req.query;
	const userRole = req.identity.role === 'secretariat' ? 'secretaria' : req.identity.role;
  const effectiveComiteId = req.identity.comiteId || comite_id;

	try {
		const todosAvisos = qGetAvisosActivos.all(confId) || [];
		if (userRole === 'secretaria') {
			return res.json({ avisos: todosAvisos });
		}

		let comitesConf = [];
		try {
			comitesConf = qGetComitesResumen.all(confId) || [];
		} catch (e) {}

		const avisosFiltrados = todosAvisos.filter(a =>
			avisoCorrespondeBackend(a, userRole, effectiveComiteId, comitesConf, comite_nombre)
		);
		res.json({ avisos: avisosFiltrados });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.patch('/api/avisos/:id/desactivar', (req, res) => {
	const avisoId = req.params.id;
	try {
		qDesactivarAviso.run(avisoId);
		io.to(`conf:${req.identity.confId}`).emit('aviso-desactivado', { id: Number(avisoId) || avisoId });
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/avisos/:id', (req, res) => {
	const avisoId = req.params.id;
	try {
		qDesactivarAviso.run(avisoId);
		io.to(`conf:${req.identity.confId}`).emit('aviso-desactivado', { id: Number(avisoId) || avisoId });
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 13. Checklist Staff
app.get('/api/conferencias/:id/checklist', (req, res) => {
	const comite_id = req.identity.comiteId || req.query.comite_id;
	const confId = req.params.id.toLowerCase().trim();
	try {
		let checklist;
		if (!comite_id || !comite_id.trim() || comite_id.trim().toUpperCase() === 'TODOS') {
			checklist = qGetChecklistAll.all(confId);
		} else if (comite_id.trim().toUpperCase() === 'GLOBAL') {
			checklist = qGetChecklistGlobal.all(confId);
		} else {
			checklist = qGetChecklistPorComite.all(confId, comite_id.trim());
		}
		res.json({ checklist });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.post('/api/conferencias/:id/checklist', (req, res) => {
	const { comite_id, titulo, asignado_a } = req.body;
	if (!titulo || !titulo.trim()) {
		return res.status(400).json({ error: 'El título de la tarea es obligatorio' });
	}
	try {
		const info = qInsertChecklistItem.run(
			req.params.id.toLowerCase().trim(),
			comite_id ? comite_id.trim() : null,
			titulo.trim(),
			asignado_a ? asignado_a.trim() : null
		);
		res.json({ ok: true, id: info.lastInsertRowid });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.patch('/api/checklist/:id/toggle', (req, res) => {
	const { completado } = req.body;
	try {
		qToggleChecklistItem.run(completado ? 1 : 0, req.params.id);
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.delete('/api/checklist/:id', (req, res) => {
	try {
		qDeleteChecklistItem.run(req.params.id);
		res.json({ ok: true, mensaje: 'Elemento eliminado' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.delete('/api/conferencias/:id/checklist/completados', (req, res) => {
	const comite_id = req.identity.comiteId || req.query.comite_id;
	const confId = req.params.id.toLowerCase().trim();
	try {
		let info;
		if (!comite_id || !comite_id.trim() || comite_id.trim().toUpperCase() === 'TODOS') {
			info = qDeleteCompletadosAll.run(confId);
		} else if (comite_id.trim().toUpperCase() === 'GLOBAL') {
			info = qDeleteCompletadosGlobal.run(confId);
		} else {
			info = qDeleteCompletadosPorComite.run(confId, comite_id.trim());
		}
		res.json({ ok: true, eliminados: info.changes });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// ==========================================
// EVENTOS WEBSOCKET (SOCKET.IO)
// ==========================================
require('./realtime.js').attachRealtime(io, db, security);
// Iniciar servidor
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
        console.log(`Servidor OpenMUN activo y escuchando en ${HOST}:${PORT}`);
});
module.exports = { app, server, io, db, limpiarConferenciasInactivas };
