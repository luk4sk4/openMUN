const { field, id, httpError, requireScope } = require('../services/auth');

const committeeFilter = "($2::text IS NULL OR ($2::text = 'GLOBAL' AND comite_id IS NULL) OR comite_id = $2::text)";

function filter(value) {
  if (value == null || value === 'TODOS') return null;
  if (value === 'GLOBAL') return value;
  return id(value);
}

function taskId(value) {
  if (!/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
    throw httpError(400, 'Tarea inválida');
  }
  return value;
}

function registerChecklist(router, db, session) {
  const path = '/conferencias/:id/checklist';
  const conference = req => {
    const cid = id(req.params.id);
    requireScope(session(req), cid, null, ['org']);
    return cid;
  };
  async function remove(cid, condition, value) {
    const result = await db.query(`
      WITH deleted AS (
        DELETE FROM checklist_staff WHERE conferencia_id = $1 AND ${condition} RETURNING id
      ), touch AS (
        UPDATE conferencias SET ultimo_cambio = GREATEST(ultimo_cambio, statement_timestamp())
        WHERE id = $1 AND EXISTS (SELECT 1 FROM deleted)
      )
      SELECT count(*)::int AS eliminados FROM deleted
    `, [cid, value]);
    return result.rows[0].eliminados;
  }

  router.get(path, async (req, res) => {
    const cid = conference(req);
    const result = await db.query(`
      SELECT id,conferencia_id,comite_id,titulo,completado,asignado_a,creado_en
      FROM checklist_staff WHERE conferencia_id = $1 AND ${committeeFilter}
      ORDER BY completado IS TRUE, creado_en DESC, id DESC
    `, [cid, filter(req.query.comite_id)]);
    res.json({ checklist: result.rows });
  });

  router.post(path, async (req, res) => {
    const cid = conference(req);
    const body = req.body || {};
    const committee = body.comite_id == null ? null : id(body.comite_id);
    const title = field(body.titulo, 255);
    const assignee = body.asignado_a == null ? null : field(body.asignado_a, 128);
    const result = await db.query(`
      INSERT INTO checklist_staff(conferencia_id,comite_id,titulo,asignado_a)
      SELECT id,$2::text,$3,$4 FROM conferencias WHERE id = $1
        AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM comites WHERE id = $2::text AND conferencia_id = $1))
      RETURNING id
    `, [cid, committee, title, assignee]);
    if (!result.rows[0]) throw httpError(404, 'Conferencia o comité no disponible');
    res.status(201).json({ ok: true, id: result.rows[0].id });
  });

  router.patch(path + '/:taskId', async (req, res) => {
    const cid = conference(req);
    const done = req.body?.completado;
    if (typeof done !== 'boolean') throw httpError(400, 'Estado de tarea inválido');
    const result = await db.query(
      'UPDATE checklist_staff SET completado = $3 WHERE conferencia_id = $1 AND id = $2',
      [cid, taskId(req.params.taskId), done]
    );
    if (!result.rowCount) throw httpError(404, 'Tarea no disponible');
    res.json({ ok: true });
  });

  router.delete(path + '/completados', async (req, res) => {
    const cid = conference(req);
    const eliminados = await remove(cid, 'completado IS TRUE AND ' + committeeFilter, filter(req.query.comite_id));
    res.json({ ok: true, eliminados });
  });

  router.delete(path + '/:taskId', async (req, res) => {
    const cid = conference(req);
    await remove(cid, 'id = $2', taskId(req.params.taskId));
    res.json({ ok: true });
  });
}

module.exports = { registerChecklist };
