const { field, id, httpError, hashPin, requireScope } = require('../services/auth');
const { privateState, publicState } = require('../services/committeeState');

const ALLOWED_CONF_COLUMNS = new Set(['nombre', 'email_admin', 'pin_admin', 'pin_acceso', 'ultimo_cambio']);
const ALLOWED_COMITE_COLUMNS = new Set(['nombre', 'tipo_sesion', 'topico_actual', 'pin_mesa', 'private_state', 'actualizado_en']);

function registerManagement(router, db, session, sessions, pepper, loginAttempt, issue, writers = new Map()) {
  router.post('/conferencias/registro', async (req, res) => {
    loginAttempt(req.ip, 'registration');
    const body = req.body || {};
    const cid = id(body.id);
    const name = field(body.nombre, 255);
    const admin = await hashPin(body.pin_admin, pepper);
    const access = body.pin_acceso ? await hashPin(body.pin_acceso, pepper) : null;
    await db.query('INSERT INTO conferencias(id,nombre,pin_admin,pin_acceso,email_admin) VALUES($1,$2,$3,$4,$5)',
      [cid, name, admin, access, body.email_admin ? field(body.email_admin, 255) : null]);
    res.status(201);
    issue(res, { conferenceId: cid, committeeId: null, role: 'org', userId: 'org' });
  });

  router.patch('/conferencias/:id', async (req, res) => {
    const cid = id(req.params.id);
    requireScope(session(req), cid, null, ['org']);
    const body = req.body || {};
    const updates = { ultimo_cambio: new Date() };
    if (body.nombre !== undefined) updates.nombre = field(body.nombre, 255);
    if (body.email_admin !== undefined) updates.email_admin = body.email_admin ? field(body.email_admin, 255) : null;
    if (body.nuevo_pin_admin !== undefined) updates.pin_admin = await hashPin(body.nuevo_pin_admin, pepper);
    if (body.pin_acceso !== undefined) updates.pin_acceso = body.pin_acceso ? await hashPin(body.pin_acceso, pepper) : null;
    const columns = Object.keys(updates);
    for (const col of columns) {
      if (!ALLOWED_CONF_COLUMNS.has(col)) throw httpError(400, 'Columna no permitida');
    }
    const result = await db.query(`UPDATE conferencias SET ${columns.map((key, i) => key + '=$' + (i + 2)).join(',')}
      WHERE id=$1 RETURNING id,nombre,email_admin`, [cid, ...Object.values(updates)]);
    if (!result.rows[0]) throw httpError(404, 'Conferencia no disponible');
    if ('pin_admin' in updates || 'pin_acceso' in updates) sessions.revoke(entry => entry.conferenceId === cid);
    res.json({ ok: true, ...result.rows[0], reauthenticate: 'pin_admin' in updates || 'pin_acceso' in updates });
  });

  async function committee(req, allowed = ['org', 'chair']) {
    const actor = session(req);
    if (!actor) throw httpError(401, 'Sesión inválida');
    const result = await db.query('SELECT id,conferencia_id FROM comites WHERE id=$1', [id(req.params.id)]);
    const row = result.rows[0];
    if (!row) throw httpError(404, 'Comité no disponible');
    requireScope(actor, row.conferencia_id, row.id, allowed);
    return row;
  }

  router.patch('/comites/:id', async (req, res) => {
    const row = await committee(req);
    const body = req.body || {};
    const updates = { actualizado_en: new Date() };
    if (body.nombre !== undefined) updates.nombre = field(body.nombre, 255);
    if (body.tipo_sesion !== undefined) updates.tipo_sesion = field(body.tipo_sesion, 32);
    if (body.topico_actual !== undefined) {
      if (typeof body.topico_actual !== 'string' || body.topico_actual.length > 2000 || body.topico_actual.includes('\0')) throw httpError(400, 'Tópico inválido');
      updates.topico_actual = body.topico_actual;
    }
    if (body.pin_mesa !== undefined) updates.pin_mesa = body.pin_mesa ? await hashPin(body.pin_mesa, pepper) : null;
    if (body.datos_json !== undefined) updates.private_state = privateState(body.datos_json);
    const columns = Object.keys(updates);
    for (const col of columns) {
      if (!ALLOWED_COMITE_COLUMNS.has(col)) throw httpError(400, 'Columna no permitida');
    }
    // Partial backups must preserve private fields omitted by the periodic autosave.
    const expressions = columns.map((key, i) => key + '=' + (key === 'private_state' ? 'private_state || ' : '') + '$' + (i + 2));
    const values = [row.id, ...Object.values(updates)];
    const updatePublic = body.datos_json !== undefined && body.backupOnly !== true;
    if (updatePublic && writers.has(row.id)) throw httpError(409, 'Detenga la emisión de Mesa antes de importar o editar el estado');
    if (updatePublic) {
      values.push(JSON.stringify(publicState(body.datos_json)));
      writers.set(row.id, 'rest-edit');
      expressions.push(`estado_debate=jsonb_build_object('version',2,'state',COALESCE(estado_debate->'state','{}'::jsonb) || $${values.length}::jsonb)`, 'debate_revision=debate_revision+1');
    }
    try {
      await db.query(`UPDATE comites SET ${expressions.join(',')} WHERE id=$1`, values);
    } finally {
      if (updatePublic) writers.delete(row.id);
    }
    if ('pin_mesa' in updates) sessions.revoke(entry => entry.committeeId === row.id && entry.role === 'chair');
    res.json({ ok: true, id: row.id });
  });

  router.delete('/comites/:id', async (req, res) => {
    const row = await committee(req, ['org']);
    await db.query(`WITH removed AS (DELETE FROM comites WHERE id=$1 AND conferencia_id=$2 RETURNING conferencia_id)
      UPDATE conferencias SET ultimo_cambio=now() WHERE id IN (SELECT conferencia_id FROM removed)`, [row.id, row.conferencia_id]);
    sessions.revoke(entry => entry.committeeId === row.id);
    res.json({ ok: true });
  });
}

module.exports = { registerManagement };
