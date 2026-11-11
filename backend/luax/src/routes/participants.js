const { randomUUID } = require('node:crypto');
const { id, field, hashPin, matchesPin, httpError, requireScope } = require('../services/auth');

function registerParticipants(router, db, session, sessions, pepper, loginAttempt, issue) {
  router.put('/comites/:id/credenciales', async (req, res) => {
    const actor = session(req);
    if (!actor) throw httpError(401, 'Sesión inválida');
    const cid = id(req.params.id);
    const row = (await db.query('SELECT conferencia_id,role_credentials FROM comites WHERE id=$1', [cid])).rows[0];
    if (!row) throw httpError(404, 'Comité no disponible');
    requireScope(actor, row.conferencia_id, cid, ['chair', 'org']);
    const updates = {};
    for (const role of ['secretariat', 'staff', 'backroom']) {
      if (req.body?.[role] !== undefined && !await matchesPin(field(req.body[role], 64), row.role_credentials?.[role] || '', pepper)) {
        updates[role] = await hashPin(req.body[role], pepper);
      }
    }
    if (!Object.keys(updates).length) return res.json({ ok: true });
    await db.query('UPDATE comites SET role_credentials=role_credentials || $2::jsonb WHERE id=$1', [cid, updates]);
    sessions.revoke(entry => entry.committeeId === cid && Object.hasOwn(updates, entry.role));
    res.json({ ok: true });
  });

  router.post('/comites/:id/participantes', async (req, res) => {
    const cid = id(req.params.id);
    const role = req.body?.role;
    if (!['delegate', 'staff', 'backroom', 'secretariat'].includes(role)) throw httpError(400, 'Rol inválido');
    const accepted = loginAttempt(req.ip, cid + ':' + role);
    const row = (await db.query(`SELECT c.conferencia_id,c.role_credentials,f.pin_acceso
      FROM comites c JOIN conferencias f ON f.id=c.conferencia_id WHERE c.id=$1`, [cid])).rows[0];
    if (!row) throw httpError(401, 'Credencial inválida');
    const verifier = role === 'delegate' ? row.pin_acceso : row.role_credentials[role];
    const access = session(req);
    const conferenceAccess = role === 'delegate' && access?.conferenceId === row.conferencia_id;
    if (!conferenceAccess && (verifier ? !await matchesPin(field(req.body?.password, 64), verifier, pepper) : role !== 'delegate')) {
      throw httpError(401, 'Credencial inválida');
    }
    accepted();
    issue(res, { conferenceId: row.conferencia_id, committeeId: cid, role, userId: randomUUID() });
  });
}

module.exports = { registerParticipants };
