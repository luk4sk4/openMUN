const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');
const db = require('./db.js');
const { createNoteRelay } = require('./noteRelay.cjs');
const app = express();
const server = http.createServer(app);
const nodemailer = require('nodemailer');
// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
// Cargar variables de entorno si existe dotenv
try {
	require('dotenv').config();
} catch (e) {}

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
		origin: function (origin, callback) {
			callback(null, true);
		},
		credentials: true
	},
	perMessageDeflate: true
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
const salasConTemporizador = new Set();
const noteRelay = createNoteRelay(io);

// ==========================================
// SANITIZACIÓN Y VALIDACIÓN DE INPUTS (Anti-SQLi)
// ==========================================
function sanitizeId(val, maxLen = 64) {
	if (val === null || val === undefined) return '';
	return String(val)
		.replace(/\0/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_-]/g, '')
		.slice(0, maxLen);
}

function sanitizeField(val, maxLen = 255) {
	if (val === null || val === undefined) return '';
	return String(val)
		.replace(/\0/g, '')
		.trim()
		.slice(0, maxLen);
}

function sanitizePin(val) {
	if (val === null || val === undefined) return '';
	return String(val)
		.replace(/\0/g, '')
		.trim()
		.slice(0, 64);
}

function sanitizeEmail(val) {
	if (!val) return null;
	const str = String(val).replace(/\0/g, '').toLowerCase().trim().slice(0, 255);
	const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
	return emailRegex.test(str) ? str : null;
}

function sanitizeDatabaseId(val) {
	if (val === null || val === undefined) return null;
	const str = String(val).trim();
	if (!/^[1-9][0-9]{0,18}$/.test(str)) return null;
	return str;
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
db.exec(`
  CREATE TRIGGER IF NOT EXISTS touch_conference_on_notice_insert AFTER INSERT ON avisos
  BEGIN UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = NEW.conferencia_id; END;
  CREATE TRIGGER IF NOT EXISTS touch_conference_on_notice_update AFTER UPDATE ON avisos
  BEGIN UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = NEW.conferencia_id; END;
  CREATE TRIGGER IF NOT EXISTS touch_conference_on_checklist_insert AFTER INSERT ON checklist_staff
  BEGIN UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = NEW.conferencia_id; END;
  CREATE TRIGGER IF NOT EXISTS touch_conference_on_checklist_update AFTER UPDATE ON checklist_staff
  BEGIN UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = NEW.conferencia_id; END;
  CREATE TRIGGER IF NOT EXISTS touch_conference_on_checklist_delete AFTER DELETE ON checklist_staff
  BEGIN UPDATE conferencias SET ultimo_cambio = CURRENT_TIMESTAMP WHERE id = OLD.conferencia_id; END;
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
    nombre = excluded.nombre,
    pin_mesa = excluded.pin_mesa,
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
  INSERT INTO avisos (conferencia_id, comite_id, emisor, tipo, mensaje) 
  VALUES (?, ?, ?, ?, ?)
`);
const qGetAvisosActivos = db.prepare(`
  SELECT id, conferencia_id, emisor, tipo, mensaje, comite_id, creado_en 
  FROM avisos 
  WHERE conferencia_id = ? 
    AND activo = 1 
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
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
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
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
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
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
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
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
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
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
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
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
    AND datetime(creado_en, '+1 month', 'floor') > datetime('now')
  ORDER BY creado_en DESC
`);
const qGetAvisosPorComite = qGetAvisosChairConComite;
const qGetAvisosPorStaff = qGetAvisosStaffConComite;
const qGetAvisosStaffAll = qGetAvisosStaffGlobales;
const qDesactivarAviso = db.prepare(`UPDATE avisos SET activo = 0 WHERE id = ?`);
const qLimpiarAvisosViejos = db.prepare(`
  DELETE FROM avisos 
  WHERE datetime(creado_en, '+1 month', 'floor') <= datetime('now')
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
  WHERE datetime(COALESCE(ultimo_cambio, creado_en), '+1 year', 'floor') <= datetime('now')
`);
const qGetComitesDeConf = db.prepare(`
  SELECT id, nombre, pin_mesa, tipo_sesion, topico_actual, datos_json, actualizado_en 
  FROM comites 
  WHERE conferencia_id = ?
`);
const qDeleteConferencia = db.prepare(`
  DELETE FROM conferencias WHERE id = ?
    AND datetime(COALESCE(ultimo_cambio, creado_en), '+1 year', 'floor') <= datetime('now')
`);
// Helper para parsear comités
function mapearComites(rawList) {
        return (rawList || []).map(c => {
                let parsedDatos = c.datos_json;
                if (typeof parsedDatos === 'string') {
                        try { parsedDatos = JSON.parse(parsedDatos); } catch (e) { parsedDatos = {}; }
                }
                return {
                        ...c,
                        requierePinMesa: Boolean(c.pin_mesa),
                        datos_json: parsedDatos || {}
                };
        });
}
// ==========================================
// AUTO-LIMPIEZA Y RESPALDO (1 AÑO)
// ==========================================
async function limpiarConferenciasInactivas() {
        try {
                const inactivas = qGetConferenciasInactivas.all();
                if (inactivas.length === 0) return;
                for (const conf of inactivas) {
                        console.log(`[Auto-Limpieza] Archivando conferencia: ${conf.nombre} (${conf.id})`);
                        const comites = qGetComitesDeConf.all(conf.id);
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
                                				if (transporter && smtpConfigured) {
					try {
						await transporter.sendMail({
							from: process.env.SMTP_FROM || `"OpenMUN" <${process.env.SMTP_USER}>`,
							to: conf.email_admin,
							subject: `Respaldo y Cierre por Inactividad: ${conf.nombre}`,
							text: `Hola,\n\nTu conferencia "${conf.nombre}" ha superado un año sin actividad y ha sido archivada.\n\nTe adjuntamos el archivo de respaldo completo.\n\nAtentamente,\nEl equipo de OpenMUN.`,
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
					}
				}
                        }
                        qDeleteConferencia.run(conf.id);
                }
        } catch (err) {
                console.error('[Auto-Limpieza] Error:', err.message);
        }
}
setInterval(limpiarConferenciasInactivas, 24 * 60 * 60 * 1000);
limpiarConferenciasInactivas();
setInterval(() => {
        try {
                qLimpiarAvisosViejos.run();
        } catch (err) {
                console.error('Error limpiando avisos antiguos:', err.message);
        }
}, 60 * 60 * 1000);
// ==========================================
// ENDPOINTS REST API
// ==========================================
// 1. Crear Conferencia
app.post('/api/conferencias', (req, res) => {
	const body = req.body || {};
	const cleanId = sanitizeId(body.id);
	const cleanNombre = sanitizeField(body.nombre, 255);
	const cleanPinAdmin = sanitizePin(body.pin_admin);
	const cleanPinAcceso = body.pin_acceso ? sanitizePin(body.pin_acceso) : null;
	const cleanEmail = body.email_admin ? sanitizeEmail(body.email_admin) : null;

	if (!cleanId || !cleanNombre || !cleanPinAdmin) {
		return res.status(400).json({ error: 'Faltan campos obligatorios válidos (id, nombre, pin_admin)' });
	}
	try {
		qInsertConferencia.run({
			id: cleanId,
			nombre: cleanNombre,
			pin_admin: cleanPinAdmin,
			pin_acceso: cleanPinAcceso,
			email_admin: cleanEmail
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
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const conf = qGetConferencia.get(confId);
	if (!conf) return res.status(404).json({ error: 'Conferencia no encontrada' });
	const pinRecibido = sanitizePin(req.body?.pin);
	if (conf.pin_acceso && conf.pin_acceso !== pinRecibido) {
		return res.status(401).json({ error: 'PIN de acceso incorrecto' });
	}
	const rawComites = qGetComitesResumen.all(conf.id);
	res.json({
		id: conf.id,
		nombre: conf.nombre,
		email_admin: conf.email_admin,
		requierePin: Boolean(conf.pin_acceso),
		comites: mapearComites(rawComites)
	});
});
// 3. Resumen de Conferencia (Dashboard Secretaría)
app.get('/api/conferencias/:id/resumen', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const conf = qGetConferencia.get(confId);
	if (!conf) return res.status(404).json({ error: 'Conferencia no encontrada' });
	const rawComites = qGetComitesResumen.all(confId);
	res.json({
		id: conf.id,
		nombre: conf.nombre,
		email_admin: conf.email_admin,
		requierePin: Boolean(conf.pin_acceso),
		comites: mapearComites(rawComites)
	});
});
// 4. Actualizar Conferencia
app.patch('/api/conferencias/:id', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const body = req.body || {};
	const pinAdminActual = sanitizePin(body.pin_admin_actual);
	if (!pinAdminActual) {
		return res.status(400).json({ error: 'Se requiere el pin_admin_actual para realizar cambios' });
	}
	const conf = qGetConferencia.get(confId);
	if (!conf) return res.status(404).json({ error: 'Conferencia no encontrada' });
	if (conf.pin_admin !== pinAdminActual) {
		return res.status(401).json({ error: 'PIN de administración incorrecto' });
	}
	try {
		const finalNombre = body.nombre !== undefined ? sanitizeField(body.nombre, 255) || conf.nombre : conf.nombre;
		const finalPinAdmin = body.nuevo_pin_admin !== undefined ? sanitizePin(body.nuevo_pin_admin) || conf.pin_admin : conf.pin_admin;
		const finalPinAcceso = body.pin_acceso !== undefined ? (body.pin_acceso ? sanitizePin(body.pin_acceso) : null) : conf.pin_acceso;
		const finalEmail = body.email_admin !== undefined ? sanitizeEmail(body.email_admin) : conf.email_admin;
		qUpdateConferencia.run({
			id: confId,
			nombre: finalNombre,
			pin_admin: finalPinAdmin,
			pin_acceso: finalPinAcceso,
			email_admin: finalEmail
		});
		res.json({ ok: true, mensaje: 'Conferencia actualizada correctamente' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// 5. Crear o guardar Comité completo
app.post('/api/conferencias/:id/comites', (req, res) => {
	const conferencia_id = sanitizeId(req.params.id);
	if (!conferencia_id) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const body = req.body || {};
	const comiteId = body.id ? sanitizeId(body.id) : `${conferencia_id}_${Date.now()}`;
	const cleanNombre = sanitizeField(body.nombre || 'Comité sin nombre', 255);
	const cleanPin = body.pin_mesa ? sanitizePin(body.pin_mesa) : null;
	const jsonStr = typeof body.datos_json === 'object' ? JSON.stringify(body.datos_json) : (body.datos_json ? String(body.datos_json).replace(/\0/g, '') : '{}');
	try {
		qUpsertComite.run({
			id: comiteId,
			conferencia_id,
			nombre: cleanNombre,
			pin_mesa: cleanPin,
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
	const comiteId = sanitizeId(req.params.id);
	if (!comiteId) return res.status(400).json({ error: 'ID de comité inválido' });
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
			...comite,
			requierePinMesa: Boolean(comite.pin_mesa),
			datos_json: parsedDatos || {}
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// 7. Acceso a Comité (Validación de PIN de Mesa Directiva)
app.post('/api/comites/:id/acceso', (req, res) => {
	const comiteId = sanitizeId(req.params.id);
	if (!comiteId) return res.status(400).json({ error: 'ID de comité inválido' });
	try {
		const comite = qGetComite.get(comiteId);
		if (!comite) return res.status(404).json({ error: 'Comité no encontrado' });
		const pinRecibido = sanitizePin(req.body?.pin);
		if (comite.pin_mesa && comite.pin_mesa !== pinRecibido) {
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
			pin_mesa: comite.pin_mesa,
			requierePinMesa: Boolean(comite.pin_mesa),
			datos_json: parsedDatos || {}
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// 8. Actualizar comité
app.patch('/api/comites/:id', (req, res) => {
	const comiteId = sanitizeId(req.params.id);
	if (!comiteId) return res.status(400).json({ error: 'ID de comité inválido' });
	const body = req.body || {};
	const comite = qGetComite.get(comiteId);
	if (!comite) {
		return res.status(404).json({ error: 'Comité no encontrado' });
	}
	let finalDatosJson = comite.datos_json;
	if (body.datos_json !== undefined) {
		finalDatosJson = typeof body.datos_json === 'object' ? JSON.stringify(body.datos_json) : (body.datos_json ? String(body.datos_json).replace(/\0/g, '') : '{}');
	}
	const finalNombre = body.nombre !== undefined ? (body.nombre ? sanitizeField(body.nombre, 255) : comite.nombre) : comite.nombre;
	const finalPin = body.pin_mesa !== undefined ? (body.pin_mesa ? sanitizePin(body.pin_mesa) : null) : comite.pin_mesa;
	const finalTipo = body.tipo_sesion !== undefined ? sanitizeField(body.tipo_sesion, 32) : comite.tipo_sesion;
	const finalTopico = body.topico_actual !== undefined ? (body.topico_actual ? sanitizeField(body.topico_actual, 2000) : '') : comite.topico_actual;
	try {
		qUpdateComiteCompleto.run({
			id: comiteId,
			nombre: finalNombre,
			pin_mesa: finalPin,
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
	const comiteId = sanitizeId(req.params.id);
	if (!comiteId) return res.status(400).json({ error: 'ID de comité inválido' });
	const body = req.body || {};
	const cleanTipo = body.tipo_sesion ? sanitizeField(body.tipo_sesion, 32) : null;
	const cleanTopico = body.topico_actual ? sanitizeField(body.topico_actual, 2000) : null;
	try {
		qUpdateComiteEstado.run(cleanTipo, cleanTopico, comiteId);
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// 10. Eliminar un comité
app.delete('/api/comites/:id', (req, res) => {
	const comiteId = sanitizeId(req.params.id);
	if (!comiteId) return res.status(400).json({ error: 'ID de comité inválido' });
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
	const comiteId = sanitizeId(req.params.id);
	const confId = sanitizeId(req.params.conferencia_id);
	if (!comiteId) return res.status(400).json({ error: 'ID de comité inválido' });
	try {
		const info = qDeleteComite.run(comiteId);
		if (confId) qTouchConferencia.run(confId);
		res.json({ ok: true, eliminados: info.changes });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// 12. Avisos
app.post('/api/conferencias/:id/avisos', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const { comite_id, emisor, tipo, mensaje } = req.body || {};
	const textoMensaje = sanitizeField(mensaje, 8000);
	if (!textoMensaje) {
		return res.status(400).json({ error: 'El mensaje es obligatorio' });
	}
	try {
		const targetComite = comite_id ? sanitizeField(comite_id, 64) : null;
		const emisorNombre = emisor ? sanitizeField(emisor, 128) : 'Organización';
		const tipoAviso = tipo ? sanitizeField(tipo, 32) : 'info';

		const info = qInsertAviso.run(
			confId,
			targetComite,
			emisorNombre,
			tipoAviso,
			textoMensaje
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

		io.to(`avisos:${confId}`).emit('avisos-actualizados', { conferencia_id: confId });

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
	const matchingComite = comites.find(c => normalizarComiteIdBackend(c?.id) === normCurrent);
	const coincideComite = target => {
	  if (!target || normCurrent === 'todos') return false;
	  if (normCurrent === target) return true;
	  const matchingName = matchingComite ? normalizarComiteIdBackend(matchingComite.nombre) : normNombre;
	  return Boolean(matchingName) && matchingName === target &&
	    !comites.some(c => normalizarComiteIdBackend(c?.id) === target);
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

			return coincideComite(targetMesa);
		}
		const targetComite = normalizarComiteIdBackend(destinoUpper);
		return coincideComite(targetComite);
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

			// El staff de conferencia (global) o sin sala fija NO debe ver los mensajes internos dirigidos a staff de comités individuales
			if ((!normCurrent && !normNombre) || normCurrent === 'todos' || userRole === 'staff_global') {
				return false;
			}
			return coincideComite(targetStaffComite);
		}
		if ((!normCurrent && !normNombre) || normCurrent === 'todos') {
			return false;
		}
		const targetComite = normalizarComiteIdBackend(destinoUpper);
		return coincideComite(targetComite);
	}

	// DELEGATE
	if (userRole === 'delegate') {
		if (destinoUpper === 'STAFF_ALL' || destinoUpper === 'STAFF_GLOBAL' || destinoUpper.startsWith('STAFF_')) return false;
		if (['CHAIRS_ALL', 'CHAIR_ALL', 'MESAS_ALL', 'MESA_ALL', 'CHAIR_GLOBAL', 'MESA_GLOBAL'].includes(destinoUpper) ||
			destinoUpper.startsWith('CHAIR_') || destinoUpper.startsWith('MESA_')) return false;
		if (destinoUpper === 'SECRETARIA' || destinoUpper === 'ORGANIZACION') return false;

		if ((normCurrent || normNombre) && normCurrent !== 'todos') {
			const targetComite = normalizarComiteIdBackend(destinoUpper);
			return coincideComite(targetComite);
		}
		return false;
	}

	return false;
}

app.get('/api/conferencias/:id/avisos', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const { comite_id, role, rol, todos, comite_nombre } = req.query;
	const userRole = sanitizeField(role || rol || '', 32).toLowerCase();
	const cleanComiteId = comite_id ? sanitizeField(comite_id, 64) : null;
	const cleanComiteNombre = comite_nombre ? sanitizeField(comite_nombre, 255) : null;

	try {
		const todosAvisos = qGetAvisosActivos.all(confId) || [];
		if (todos === 'true' || userRole === 'secretaria' || userRole === 'organizacion' || userRole === 'admin') {
			return res.json({ avisos: todosAvisos });
		}

		let comitesConf = [];
		try {
			comitesConf = qGetComitesResumen.all(confId) || [];
		} catch (e) {}

		const avisosFiltrados = todosAvisos.filter(a =>
			avisoCorrespondeBackend(a, userRole, cleanComiteId, comitesConf, cleanComiteNombre)
		);
		res.json({ avisos: avisosFiltrados });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.patch('/api/avisos/:id/desactivar', (req, res) => {
	const avisoId = sanitizeDatabaseId(req.params.id);
	if (!avisoId) return res.status(400).json({ error: 'ID de aviso inválido' });
	try {
		qDesactivarAviso.run(avisoId);
		io.emit('aviso-desactivado', { id: Number(avisoId) || avisoId });
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.delete('/api/avisos/:id', (req, res) => {
	const avisoId = sanitizeDatabaseId(req.params.id);
	if (!avisoId) return res.status(400).json({ error: 'ID de aviso inválido' });
	try {
		qDesactivarAviso.run(avisoId);
		io.emit('aviso-desactivado', { id: Number(avisoId) || avisoId });
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// 13. Checklist Staff
app.get('/api/conferencias/:id/checklist', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const { comite_id } = req.query;
	const cleanComiteId = comite_id ? sanitizeField(comite_id, 64) : null;
	try {
		let checklist;
		if (!cleanComiteId || cleanComiteId.toUpperCase() === 'TODOS') {
			checklist = qGetChecklistAll.all(confId);
		} else if (cleanComiteId.toUpperCase() === 'GLOBAL') {
			checklist = qGetChecklistGlobal.all(confId);
		} else {
			checklist = qGetChecklistPorComite.all(confId, cleanComiteId);
		}
		res.json({ checklist });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.post('/api/conferencias/:id/checklist', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const { comite_id, titulo, asignado_a } = req.body || {};
	const cleanTitulo = sanitizeField(titulo, 255);
	if (!cleanTitulo) {
		return res.status(400).json({ error: 'El título de la tarea es obligatorio' });
	}
	try {
		const cleanComiteId = comite_id ? sanitizeField(comite_id, 64) : null;
		const cleanAsignadoA = asignado_a ? sanitizeField(asignado_a, 128) : null;
		const info = qInsertChecklistItem.run(
			confId,
			cleanComiteId,
			cleanTitulo,
			cleanAsignadoA
		);
		res.json({ ok: true, id: info.lastInsertRowid });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.patch('/api/checklist/:id/toggle', (req, res) => {
	const taskId = sanitizeDatabaseId(req.params.id);
	if (!taskId) return res.status(400).json({ error: 'ID de tarea inválido' });
	const { completado } = req.body || {};
	try {
		qToggleChecklistItem.run(completado ? 1 : 0, taskId);
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.delete('/api/checklist/:id', (req, res) => {
	const taskId = sanitizeDatabaseId(req.params.id);
	if (!taskId) return res.status(400).json({ error: 'ID de tarea inválido' });
	try {
		qDeleteChecklistItem.run(taskId);
		res.json({ ok: true, mensaje: 'Elemento eliminado' });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
app.delete('/api/conferencias/:id/checklist/completados', (req, res) => {
	const confId = sanitizeId(req.params.id);
	if (!confId) return res.status(400).json({ error: 'ID de conferencia inválido' });
	const { comite_id } = req.query;
	const cleanComiteId = comite_id ? sanitizeField(comite_id, 64) : null;
	try {
		let info;
		if (!cleanComiteId || cleanComiteId.toUpperCase() === 'TODOS') {
			info = qDeleteCompletadosAll.run(confId);
		} else if (cleanComiteId.toUpperCase() === 'GLOBAL') {
			info = qDeleteCompletadosGlobal.run(confId);
		} else {
			info = qDeleteCompletadosPorComite.run(confId, cleanComiteId);
		}
		res.json({ ok: true, eliminados: info.changes });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// ==========================================
// EVENTOS WEBSOCKET (SOCKET.IO)
// ==========================================
io.on('connection', (socket) => {
	console.log(`Usuario conectado: ${socket.id}`);
	socket.on('unirse-conferencia', (confId) => {
		if (!confId) return;
		const confNorm = confId.toString().trim().toLowerCase();
		socket.join(`avisos:${confNorm}`);
	});
	socket.on('unirse-comite', (request, acknowledge) => {
		const sala = typeof request === 'object' ? request?.sala : request;
		if (!sala) return;
		const salaNorm = sala.toString().trim();
		if (request?.isHost && !noteRelay.registerHost(socket, salaNorm)) {
			if (typeof acknowledge === 'function') acknowledge({ ok: false, error: 'Esta sala ya tiene una Mesa conectada' });
			return;
		}
		socket.join(salaNorm);
		if (typeof acknowledge === 'function') acknowledge({ ok: true });
		try {
			const comiteGuardado = qGetComite.get(salaNorm.toLowerCase());
			if (comiteGuardado && comiteGuardado.datos_json) {
				const datos = typeof comiteGuardado.datos_json === 'string'
					? JSON.parse(comiteGuardado.datos_json)
					: comiteGuardado.datos_json;
				// Los históricos de notas se entregan mediante AUTH_RESULT, filtrados por rol.
				const publicData = { ...datos };
				delete publicData.announcements;
				delete publicData.notes;
				delete publicData.openmun_notes;
				if (publicData.snapshot && typeof publicData.snapshot === 'object') {
					publicData.snapshot = { ...publicData.snapshot };
					delete publicData.snapshot.openmun_announcements;
					delete publicData.snapshot.announcements;
					delete publicData.snapshot.openmun_notes;
					delete publicData.snapshot.notes;
				}
				socket.emit('cargar-estado-inicial', request?.isHost ? datos : publicData);
			}
		} catch (e) {
			console.error('Error recuperando estado de SQLite en socket:', e.message);
		}
                if (!salasConTemporizador.has(salaNorm)) {
                        salasConTemporizador.add(salaNorm);
                        setTimeout(() => {
                                io.to(salaNorm).emit('cierre-forzado', 'La sala ha excedido el límite de 12 horas.');
                                io.in(salaNorm).socketsLeave(salaNorm);
                                noteRelay.expire(salaNorm);
                                salasConTemporizador.delete(salaNorm);
                        }, 12 * 60 * 60 * 1000);
                }
        });
        socket.on('enviar-datos', (data) => {
                if (!data || !data.sala) return;
                const salaNorm = data.sala.toString().trim();
                if (!noteRelay.forward(socket, salaNorm, data.json)) return;
                try {
                        if (data.json && typeof data.json === 'object' && !data.json.type && !data.json._c) {
                                const jsonStr = JSON.stringify(data.json);
                                const confId = salaNorm.includes('_') ? salaNorm.split('_')[0] : salaNorm;

                                qUpsertComite.run({
                                        id: salaNorm.toLowerCase(),
                                        conferencia_id: confId.toLowerCase(),
                                        nombre: data.json.nombreComite || data.json.comision || null,
                                        pin_mesa: null,
                                        datos_json: jsonStr
                                });
                                qTouchConferencia.run(confId.toLowerCase());
                        }
                } catch (err) { }
        });
        socket.on('disconnecting', () => {
                noteRelay.release(socket);
                for (const sala of socket.rooms) {
                        if (sala !== socket.id) {
                                socket.to(sala).emit('nuevos-datos', {
                                        type: 'PEER_DISCONNECTED',
                                        payload: { socketId: socket.id }
                                });
                        }
                }
        });
        socket.on('disconnect', () => {
                console.log(`Usuario desconectado: ${socket.id}`);
        });
});
// Iniciar servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
        console.log(`Servidor OpenMUN activo y escuchando en ${HOST}:${PORT}`);
});
