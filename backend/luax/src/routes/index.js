const { Router } = require('express');
const { timingSafeEqual } = require('node:crypto');
const { registerChecklist } = require('./checklist');
const { createLoginLimiter, field, id, httpError, hashPin, matchesPin, pinInput, requireScope } = require('../services/auth');

const committeeRoles = ['chair', 'staff', 'delegate', 'backroom'];
const noteRoles = ['org', 'chair'];

function routes(db, sessions, { bootstrapToken, pepper }) {
  const router = Router();
  const loginAttempt = createLoginLimiter();
  const session = req => sessions.get(/^Bearer (\S+)$/.exec(req.get('authorization') || '')?.[1]);
  registerChecklist(router, db, session);
  const issue = (res, identity) => {
    res.set('Cache-Control', 'no-store').json({ ...sessions.issue(identity), ...identity });
  };
  const committee = async cid => {
    const result = await db.query(
      'SELECT id, conferencia_id, nombre, pin_mesa, tipo_sesion, topico_actual FROM comites WHERE id=$1', [cid]
    );
    if (!result.rows[0]) throw httpError(404, 'Comité no encontrado');
    return result.rows[0];
  };
  const authorized = async (req, cid, roles) => {
    const identity = session(req);
    if (!identity) throw httpError(401, 'Sesión inválida');
    const row = await committee(id(cid));
    requireScope(identity, row.conferencia_id, row.id, roles);
    return { identity, row };
  };

  router.post('/conferencias', async (req, res) => {
    loginAttempt(req.ip, 'bootstrap');
    const provided = Buffer.from(req.get('authorization')?.slice(7) || '');
    const expected = Buffer.from(bootstrapToken);
    if (!req.get('authorization')?.startsWith('Bearer ') ||
        provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw httpError(401, 'Credencial inválida');
    }
    const body = req.body || {};
    const conferenceId = id(body.id);
    const name = field(body.nombre, 255);
    const email = body.email_admin == null ? null : field(body.email_admin, 255);
    const admin = await hashPin(body.pin_admin, pepper);
    const access = body.pin_acceso == null ? null : await hashPin(body.pin_acceso, pepper);
    await db.query('INSERT INTO conferencias(id,nombre,pin_admin,pin_acceso,email_admin) VALUES($1,$2,$3,$4,$5)',
      [conferenceId, name, admin, access, email]);
    res.status(201).json({ ok: true, id: conferenceId });
  });

  router.post('/conferencias/:id/acceso', async (req, res) => {
    const conferenceId = id(req.params.id);
    const role = req.body?.role ?? 'observer';
    if (role !== 'org' && role !== 'observer') throw httpError(400, 'Rol inválido');
    loginAttempt(req.ip, conferenceId + ':' + role);
    const pin = req.body?.pin == null ? '' : pinInput(req.body.pin);
    const result = await db.query('SELECT pin_admin, pin_acceso FROM conferencias WHERE id=$1', [conferenceId]);
    const row = result.rows[0];
    const verifier = role === 'org' ? row?.pin_admin : row?.pin_acceso;
    const valid = verifier ? await matchesPin(pin, verifier, pepper) : row && role === 'observer';
    if (!valid) throw httpError(401, 'Credencial inválida');
    issue(res, { conferenceId, role, userId: role, committeeId: null });
  });

  router.post('/comites/:id/acceso', async (req, res) => {
    const cid = id(req.params.id);
    loginAttempt(req.ip, cid + ':chair');
    const pin = pinInput(req.body?.pin);
    const result = await db.query('SELECT conferencia_id, pin_mesa FROM comites WHERE id=$1', [cid]);
    const row = result.rows[0];
    if (!row?.pin_mesa || !await matchesPin(pin, row.pin_mesa, pepper)) throw httpError(401, 'Credencial inválida');
    issue(res, { conferenceId: row.conferencia_id, committeeId: cid, role: 'chair', userId: 'chair' });
  });

  router.get('/conferencias/:id/resumen', async (req, res) => {
    const cid = id(req.params.id);
    const identity = requireScope(session(req), cid);
    const result = await db.query(
      'SELECT id,nombre,pin_acceso IS NOT NULL AS "requierePin" FROM conferencias WHERE id=$1', [cid]
    );
    if (!result.rows[0]) throw httpError(404, 'Conferencia no encontrada');
    const committees = await db.query(`
      SELECT id,conferencia_id,nombre,tipo_sesion,topico_actual,actualizado_en,
        pin_mesa IS NOT NULL AS "requierePinMesa"
      FROM comites WHERE conferencia_id=$1 AND ($2::text IS NULL OR id=$2) ORDER BY id
    `, [cid, identity.committeeId]);
    res.json({ ...result.rows[0], comites: committees.rows });
  });

  router.post('/conferencias/:id/comites', async (req, res) => {
    const cid = id(req.params.id);
    requireScope(session(req), cid, null, ['org']);
    const body = req.body || {};
    const comiteId = id(body.id);
    const name = field(body.nombre, 255);
    const verifier = body.pin_mesa == null ? null : await hashPin(body.pin_mesa, pepper);
    await db.query('INSERT INTO comites(id,conferencia_id,nombre,pin_mesa) VALUES($1,$2,$3,$4)', [comiteId, cid, name, verifier]);
    res.status(201).json({ ok: true, comiteId });
  });

  router.post('/conferencias/:id/sesiones', async (req, res) => {
    const cid = id(req.params.id);
    requireScope(session(req), cid, null, ['org']);
    const role = req.body?.role;
    if (!committeeRoles.includes(role)) throw httpError(400, 'Rol inválido');
    const row = await committee(id(req.body?.comiteId));
    if (row.conferencia_id !== cid) throw httpError(403, 'Acceso denegado');
    const userId = role === 'chair' ? 'chair' : id(req.body?.userId);
    issue(res, { conferenceId: cid, committeeId: row.id, role, userId });
  });

  router.get('/comites/:id', async (req, res) => {
    const { row } = await authorized(req, req.params.id);
    const { pin_mesa: verifier, ...publicFields } = row;
    res.json({ ...publicFields, requierePinMesa: Boolean(verifier) });
  });

  router.post('/notas', async (req, res) => {
    const { identity, row } = await authorized(req, req.body?.comiteId, noteRoles);
    const country = req.body.pais == null ? null : field(req.body.pais, 128);
    const content = field(req.body.contenido, 8000);
    const result = await db.query(`
      INSERT INTO notas_intervenciones(comite_id,pais,autor,contenido)
      VALUES($1,$2,$3,$4) RETURNING id,creado_en
    `, [row.id, country, identity.userId, content]);
    res.status(201).json({ ok: true, nota: result.rows[0] });
  });

  router.get('/notas/:comiteId', async (req, res) => {
    const { row } = await authorized(req, req.params.comiteId, noteRoles);
    const country = req.query.pais == null ? null : field(req.query.pais, 128);
    const result = await db.query(`
      SELECT id,pais,autor,contenido,creado_en FROM notas_intervenciones
      WHERE comite_id=$1 AND ($2::text IS NULL OR lower(pais)=lower($2)) ORDER BY creado_en DESC
    `, [row.id, country]);
    res.json({ notas: result.rows });
  });

  return router;
}

module.exports = { routes };
