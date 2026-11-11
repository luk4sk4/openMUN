const { field, httpError } = require('../services/auth');

const roles = ['org', 'chair', 'secretariat', 'staff', 'backroom', 'delegate'];
const columns = `backup_id,emisor_rol,emisor_id,destino_tipo,destino_rol,destino_id,
  contenido,estado,creado_en,client_id,tipo_aviso,motivo_moderacion`;
const scope = "tipo_aviso IS NULL OR tipo_aviso='room_announcement'";

function validate(row) {
  if (!row || typeof row.backup_id !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.backup_id) ||
      !roles.includes(row.emisor_rol) || !['all', 'role', 'direct'].includes(row.destino_tipo) ||
      !['delivered', 'pending_approval', 'rejected', 'archived'].includes(row.estado) ||
      (row.tipo_aviso != null && row.tipo_aviso !== 'room_announcement') ||
      typeof row.creado_en !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(row.creado_en) ||
      !Number.isFinite(Date.parse(row.creado_en))) throw httpError(400, 'Historial de comité inválido');
  field(row.emisor_id, 64);
  if (row.destino_tipo === 'all' ? row.destino_rol != null : !roles.includes(row.destino_rol)) {
    throw httpError(400, 'Destinatario inválido');
  }
  if (row.destino_tipo === 'direct') field(row.destino_id, 64);
  else if (row.destino_id != null) throw httpError(400, 'Destinatario inválido');
  if (row.client_id != null) field(row.client_id, 128);
  if (row.motivo_moderacion != null) field(row.motivo_moderacion, 8000);
  field(row.contenido, 64000);
  const creado_en = new Date(row.creado_en).toISOString();
  let contenido = row.contenido;
  if (row.client_id != null || row.tipo_aviso != null) {
    let content;
    try { content = JSON.parse(row.contenido); } catch {}
    if (!content || typeof content !== 'object' || Array.isArray(content) ||
        row.client_id == null || content.id !== row.client_id) throw httpError(400, 'Mensaje inválido');
    const base = { id: row.client_id, text: field(content.text, 8000), timestamp: Date.parse(creado_en) };
    if (row.tipo_aviso === 'room_announcement') {
      contenido = JSON.stringify({ ...base, title: field(content.title, 255), priority: field(content.priority, 32),
        target: field(content.target, 64), senderRole: row.emisor_rol, senderName: row.emisor_rol });
    } else {
      contenido = JSON.stringify({ ...base, from: field(content.from, 128), fromRole: row.emisor_rol,
        to: field(content.to, 64), type: field(content.type, 64) });
    }
  }
  return { ...row, creado_en, contenido };
}

function registerCommitteeHistory(router, db, authorized) {
  router.get('/comites/:id/historial-respaldo', async (req, res) => {
    const { row } = await authorized(req, req.params.id, ['org']);
    const result = await db.query(`SELECT ${columns} FROM mensajes
      WHERE conferencia_id=$1 AND comite_id=$2 AND (${scope})
      ORDER BY creado_en,id`, [row.conferencia_id, row.id]);
    res.set('Cache-Control', 'no-store').json({ mensajes: result.rows });
  });

  router.post('/comites/:id/historial-respaldo', async (req, res) => {
    const { row } = await authorized(req, req.params.id, ['org']);
    const messages = req.body?.mensajes;
    if (!Array.isArray(messages) || messages.length > 100) throw httpError(400, 'Lote de historial inválido');
    const result = await db.query(`INSERT INTO mensajes(conferencia_id,comite_id,${columns})
      SELECT c.conferencia_id,c.id,${columns} FROM comites c
      CROSS JOIN jsonb_to_recordset($3::jsonb) AS m(
        backup_id uuid,emisor_rol text,emisor_id text,destino_tipo text,destino_rol text,destino_id text,
        contenido text,estado text,creado_en timestamptz,client_id text,tipo_aviso text,motivo_moderacion text)
      WHERE c.conferencia_id=$1 AND c.id=$2 ON CONFLICT DO NOTHING`,
    [row.conferencia_id, row.id, JSON.stringify(messages.map(validate))]);
    res.json({ importados: result.rowCount });
  });
}

module.exports = { registerCommitteeHistory };
