const { field, id, httpError, requireScope } = require('../services/auth');

function noticeTarget(value) {
  if (value == null || ['GLOBAL', 'ALL', 'TODOS'].includes(value)) return { committee: null, role: null, code: null };
  const roles = { SECRETARIA: 'org', ORGANIZACION: 'org', STAFF_ALL: 'staff', CHAIRS_ALL: 'chair' };
  if (roles[value]) return { committee: null, role: roles[value], code: value };
  const match = /^(STAFF_COMITE_|CHAIR_)(.+)$/.exec(value);
  const committee = id((match?.[2] || value).toLowerCase());
  return { committee, role: match ? (match[1] === 'CHAIR_' ? 'chair' : 'staff') : null, code: value };
}

function canReadNotice(actor, row) {
  return actor?.conferenceId === row.conferencia_id && (actor.role === 'org' ||
    (row.emisor_rol === actor.role && row.emisor_id === actor.userId) ||
    ((!row.comite_id || row.comite_id === actor.committeeId) && (!row.destino_rol || row.destino_rol === actor.role)));
}

function noticeView(row) {
  return { id: row.id, conferencia_id: row.conferencia_id, comite_id: row.notice_target,
    emisor: row.emisor_rol === 'org' ? 'organizacion' : row.emisor_rol,
    tipo: row.tipo_aviso, mensaje: row.contenido, activo: row.estado === 'delivered', creado_en: row.creado_en };
}

function registerNotices(router, db, session, publish) {
  const path = '/conferencias/:id/avisos';
  const actorFor = req => requireScope(session(req), id(req.params.id));
  router.get(path, async (req, res) => {
    const actor = actorFor(req);
    const result = await db.query(`SELECT * FROM mensajes WHERE conferencia_id=$1 AND tipo_aviso IS NOT NULL AND tipo_aviso <> 'room_announcement'
      AND (creado_en AT TIME ZONE 'UTC') + INTERVAL '1 month' > statement_timestamp() AT TIME ZONE 'UTC'
      ORDER BY creado_en DESC,id DESC LIMIT 1000`, [actor.conferenceId]);
    const all = req.query.todos === 'true';
    res.json({ avisos: result.rows.filter(row => canReadNotice(actor, row) && (all || row.estado === 'delivered')).map(noticeView) });
  });
  router.post(path, async (req, res) => {
    const actor = actorFor(req);
    requireScope(actor, actor.conferenceId, null, ['org', 'staff', 'chair', 'secretariat']);
    const target = noticeTarget(req.body?.comite_id);
    requireScope(actor, actor.conferenceId, target.committee);
    const type = field(req.body?.tipo || 'info', 32);
    if (type === 'room_announcement') throw httpError(400, 'Tipo de aviso reservado');
    const content = field(req.body?.mensaje, 8000);
    if (target.committee) {
      const exists = await db.query('SELECT 1 FROM comites WHERE id=$1 AND conferencia_id=$2', [target.committee, actor.conferenceId]);
      if (!exists.rowCount) throw httpError(404, 'Comité no disponible');
    }
    const result = await db.query(`INSERT INTO mensajes(conferencia_id,comite_id,emisor_rol,emisor_id,
      destino_tipo,destino_rol,contenido,tipo_aviso,notice_target)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [actor.conferenceId, target.committee, actor.role, actor.userId, target.role ? 'role' : 'all', target.role, content, type, target.code]);
    const row = result.rows[0];
    publish('nuevo-aviso', row, noticeView(row), canReadNotice);
    res.status(201).json({ ok: true, id: row.id, aviso: noticeView(row) });
  });
  async function modify(req, res, remove) {
    const actor = actorFor(req);
    requireScope(actor, actor.conferenceId, null, ['org', 'staff', 'chair', 'secretariat']);
    if (!/^[1-9][0-9]{0,18}$/.test(req.params.noticeId) || BigInt(req.params.noticeId) > 9223372036854775807n) throw httpError(400, 'Aviso inválido');
    const result = await db.query(`${remove ? 'DELETE FROM mensajes' : "UPDATE mensajes SET estado='archived'"}
      WHERE id=$1 AND conferencia_id=$2 AND tipo_aviso IS NOT NULL
      AND ($3='org' OR (emisor_rol=$3 AND emisor_id=$4)) RETURNING *`,
    [req.params.noticeId, actor.conferenceId, actor.role, actor.userId]);
    if (!result.rows[0]) throw httpError(404, 'Aviso no disponible');
    publish('aviso-desactivado', result.rows[0], { id: req.params.noticeId }, canReadNotice);
    res.json({ ok: true });
  }
  router.patch(path + '/:noticeId/desactivar', (req, res) => modify(req, res, false));
  router.delete(path + '/:noticeId', (req, res) => modify(req, res, true));
}

module.exports = { registerNotices, noticeTarget, canReadNotice, noticeView };
