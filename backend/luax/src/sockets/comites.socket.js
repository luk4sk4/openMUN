const { id, field, httpError, requireScope } = require('../services/auth');
const { createDebateQueue } = require('../services/debateQueue');
const { validateSnapshot } = require('../services/snapshot');

const conferenceRoom = cid => 'conf:' + cid;
const roles = ['chair', 'staff', 'delegate', 'backroom'];
const committeeRoom = (conference, cid) => conferenceRoom(conference) + ':comite:' + cid;
const roleRoom = (room, role) => room + ':role:' + role;
const userRoom = (room, role, userId) => roleRoom(room, role) + ':user:' + userId;

function createPersistence(db) {
  return createDebateQueue(async (committee, { conference, revision, snapshot, publish }) => {
    const result = await db.query(`
      WITH saved AS (
        UPDATE comites SET estado_debate=$3, debate_revision=$4, actualizado_en=now()
        WHERE id=$1 AND conferencia_id=$2 AND debate_revision<$4
        RETURNING conferencia_id
      )
      UPDATE conferencias SET ultimo_cambio=now() WHERE id IN (SELECT conferencia_id FROM saved)
      RETURNING id
    `, [committee, conference, snapshot, revision]);
    if (!result.rowCount) throw httpError(409, 'Revisión obsoleta o comité no disponible');
    publish();
    return revision;
  }, 3000, (incoming, pending) => incoming.revision > pending.revision);
}

function registerCommitteeSockets(io, socket, on, db, persistence) {
  const committeeFor = (body, actor, allowed) => {
    const committee = id(body?.comiteId);
    requireScope(actor, actor.conferenceId, committee, allowed);
    return committee;
  };
  const recipients = (room, message) => message.destino_tipo === 'direct'
    ? io.to(userRoom(room, message.destino_rol, message.destino_id))
    : io.to(roleRoom(room, message.destino_rol));

  on('unirse-comite', async (body, actor) => {
    const cid = committeeFor(body, actor, roles);
    const membership = await db.query('SELECT 1 FROM comites WHERE id=$1 AND conferencia_id=$2',
      [cid, actor.conferenceId]);
    if (!membership.rowCount) throw httpError(404, 'Comité no encontrado');
    const room = committeeRoom(actor.conferenceId, cid);
    if (!socket.connected || actor.expiresAt <= Date.now()) throw httpError(401, 'Sesión inválida');
    await socket.join([room, roleRoom(room, actor.role), userRoom(room, actor.role, actor.userId)]);
    const result = await db.query('SELECT estado_debate,debate_revision FROM comites WHERE id=$1 AND conferencia_id=$2',
      [cid, actor.conferenceId]);
    const row = result.rows[0];
    if (!row) {
      for (const name of [room, roleRoom(room, actor.role), userRoom(room, actor.role, actor.userId)]) await socket.leave(name);
      throw httpError(404, 'Comité no encontrado');
    }
    if (Number(row.debate_revision) > 0) {
      socket.emit('cargar-estado-inicial', {
        revision: Number(row.debate_revision), snapshot: validateSnapshot(row.estado_debate)
      });
    }
    return { revision: Number(row.debate_revision) };
  });

  on('unirse-conferencia', async (body, actor) => {
    const cid = id(body?.confId);
    requireScope(actor, cid);
    const result = await db.query('SELECT 1 FROM conferencias WHERE id=$1', [cid]);
    if (!result.rowCount) throw httpError(404, 'Conferencia no encontrada');
    if (!socket.connected || actor.expiresAt <= Date.now()) throw httpError(401, 'Sesión inválida');
    await socket.join([conferenceRoom(cid), conferenceRoom(cid) + ':role:' + actor.role]);
  });

  on('enviar-datos-debate', (body, actor) => {
    const cid = committeeFor(body, actor, ['org', 'chair']);
    if (!Number.isSafeInteger(body.revision) || body.revision < 1) throw httpError(400, 'Revisión inválida');
    const snapshot = validateSnapshot(body.snapshot);
    return persistence.enqueue(cid, {
      conference: actor.conferenceId, revision: body.revision, snapshot,
      publish: () => socket.to(committeeRoom(actor.conferenceId, cid)).emit('nuevos-datos-debate', {
        revision: body.revision, snapshot
      })
    });
  });

  on('enviar-mensaje', async (body, actor) => {
    const cid = committeeFor(body, actor, roles);
    const content = field(body.content, 8000);
    const target = body.target;
    if (!roles.includes(target?.role) || !['direct', 'role'].includes(target?.type)) {
      throw httpError(400, 'Destinatario inválido');
    }
    if (actor.role === 'delegate' && target.type !== 'direct') throw httpError(403, 'Acceso denegado');
    const targetId = target.type === 'direct' ? id(target.id) : null;
    const status = actor.role === 'delegate' ? 'pending_approval' : 'delivered';
    const result = await db.query(`
      INSERT INTO mensajes(conferencia_id,comite_id,emisor_rol,emisor_id,destino_tipo,destino_rol,destino_id,contenido,estado)
      SELECT conferencia_id,id,$3,$4,$5,$6,$7,$8,$9 FROM comites WHERE id=$1 AND conferencia_id=$2
      RETURNING id,emisor_rol,emisor_id,destino_tipo,destino_rol,destino_id,contenido,estado,creado_en
    `, [cid, actor.conferenceId, actor.role, actor.userId, target.type, target.role, targetId, content, status]);
    const message = result.rows[0];
    if (!message) throw httpError(404, 'Comité no encontrado');
    const room = committeeRoom(actor.conferenceId, cid);
    if (status === 'pending_approval') io.to(roleRoom(room, 'staff')).emit('mensaje-para-moderar', message);
    else recipients(room, message).emit('nuevo-mensaje-privado', message);
    socket.emit('mensaje-enviado', { id: message.id, status });
    return { id: message.id, status };
  });

  on('resolver-moderacion', async (body, actor) => {
    const cid = committeeFor(body, actor, ['staff']);
    const messageId = body.mensajeId;
    if (typeof messageId !== 'string' || !/^[1-9][0-9]{0,18}$/.test(messageId) ||
        BigInt(messageId) > 9223372036854775807n || !['aprobar', 'rechazar'].includes(body.accion)) {
      throw httpError(400, 'Decisión inválida');
    }
    const approved = body.accion === 'aprobar';
    const status = approved ? 'delivered' : 'rejected';
    const reason = approved || body.motivo == null ? null : field(body.motivo, 500);
    const result = await db.query(`
      UPDATE mensajes SET estado=$4,motivo_moderacion=$5
      WHERE id=$1 AND comite_id=$2 AND conferencia_id=$3 AND estado='pending_approval'
      RETURNING id,emisor_rol,emisor_id,destino_tipo,destino_rol,destino_id,contenido,estado,creado_en
    `, [messageId, cid, actor.conferenceId, status, reason]);
    const message = result.rows[0];
    if (!message) throw httpError(409, 'El mensaje ya no está pendiente o no está disponible');
    const room = committeeRoom(actor.conferenceId, cid);
    if (approved) recipients(room, message).emit('nuevo-mensaje-privado', message);
    io.to(userRoom(room, message.emisor_rol, message.emisor_id))
      .emit('estado-mensaje-actualizado', { id: message.id, status, motivo: reason });
    return { id: message.id, status };
  });

  on('enviar-aviso-conferencia', async (body, actor) => {
    const cid = id(body?.confId);
    requireScope(actor, cid, null, ['org']);
    const alcance = body.alcance;
    const tipo = body.tipo ?? 'info';
    if (!['all', 'mesas', 'staffs'].includes(alcance) || !['info', 'urgente'].includes(tipo)) {
      throw httpError(400, 'Aviso inválido');
    }
    const mensaje = field(body.mensaje, 8000);
    const target = { all: null, mesas: 'chair', staffs: 'staff' }[alcance];
    const result = await db.query(`
      INSERT INTO mensajes(conferencia_id,emisor_rol,emisor_id,destino_tipo,destino_rol,contenido,tipo_aviso)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,creado_en
    `, [cid, actor.role, actor.userId, target ? 'role' : 'all', target, mensaje, tipo]);
    const aviso = { ...result.rows[0], confId: cid, alcance, mensaje, tipo, emisor: { rol: actor.role, id: actor.userId } };
    io.to(conferenceRoom(cid) + (target ? ':role:' + target : '')).emit('nuevo-aviso-conferencia', aviso);
    return { id: aviso.id };
  });
}

module.exports = { createPersistence, registerCommitteeSockets };
