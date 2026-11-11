const { randomUUID } = require('node:crypto');
const { id, field, httpError, requireScope } = require('../services/auth');
const { publicState, privateState, chairState } = require('../services/committeeState');

const room = cid => 'v2:' + cid;
const roles = ['chair', 'secretariat', 'staff', 'backroom', 'delegate'];
const symbolicRoles = { CHAIR: 'chair', MESA: 'chair', STAFF: 'staff', BACKROOM: 'backroom', SECRETARIA: 'secretariat' };
const actions = new Set(['cambiarTipoSesion','registrarVotoPais','configurarVotacion','resetearVotacion','setPaises',
  'cambiarEstatusPais','actualizarPais','eliminarPais','resetearAsistencia','toggleVetoPais','ordenarPaisesAlfabetico',
  'reordenarPaises','agregarOrador','removerOrador','moverOrador','vaciarOradoresGSL','ordenarOradoresGSLAlfabetico',
  'reordenarOradoresGSL','cederTiempo','agregarOradorCaucus','removerOradorCaucus','avanzarOradorCaucus',
  'vaciarOradoresDebate','ordenarOradoresDebateAlfabetico','reordenarOradoresDebate','moverOradorCaucus','setCaucusActivo',
  'actualizarSesionesDebate','establecerAgenda','cambiarTemaActual','setNombreComite','agregarMocion','activarMocion',
  'votarMocion','eliminarMocion','reordenarMociones','ordenarMocionesDisruptividad','registrarIntervencion',
  'actualizarRelojGSL','setEnmiendasSesion','guardarResolucionEnmiendas','agregarEnmiendaResolucion',
  'resolverEnmiendaResolucion','eliminarEnmiendaResolucion','eliminar_propuesta_enmienda']);

function createRelay(io, db, sessions, persistence, writers = new Map()) {
  const members = new Map();
  const countries = new Map();
  const normalize = value => value?.trim().toLocaleLowerCase('es');
  const peers = cid => [...members.entries()].filter(([, m]) => m.committeeId === cid)
    .map(([peerId, m]) => ({ peerId, socketId: peerId, role: m.role, country: m.country, clientId: m.userId }));
  const emit = (cid, type, payload) => io.to(room(cid)).emit('luax-message', { type, payload });
  const noteView = row => ({ ...JSON.parse(row.contenido), id: row.client_id, serverId: row.id,
    status: { pending_approval: 'pending', delivered: 'approved', rejected: 'rejected' }[row.estado] });
  const canRead = (m, row) => row.conferencia_id === m.conferenceId && row.comite_id === m.committeeId &&
    ((m.userId === row.emisor_id && m.role === row.emisor_rol) || (m.role === 'staff' && row.estado === 'pending_approval') ||
    (row.estado === 'delivered' && (row.destino_tipo === 'all' ||
      (row.destino_rol === m.role && (row.destino_tipo === 'role' || normalize(m.country) === row.destino_id)))));
  function publishNote(row) {
    for (const [sid, member] of members) if (sessions.get(member.token) && canRead(member, row)) {
      io.to(sid).emit('luax-message', { type: 'NOTE_RECEIVED', payload: noteView(row) });
    }
  }
  async function history(member) {
    const result = await db.query(`SELECT * FROM mensajes WHERE conferencia_id=$1 AND comite_id=$2
      AND tipo_aviso IS NULL AND client_id IS NOT NULL
      AND (creado_en AT TIME ZONE 'UTC') + INTERVAL '1 month' > statement_timestamp() AT TIME ZONE 'UTC'
      ORDER BY creado_en DESC,id DESC LIMIT 1000`, [member.conferenceId, member.committeeId]);
    return result.rows.filter(row => canRead(member, row)).map(noteView);
  }
  async function announcements(member) {
    const result = await db.query(`SELECT * FROM mensajes WHERE conferencia_id=$1 AND comite_id=$2
      AND tipo_aviso='room_announcement' AND estado='delivered'
      AND (creado_en AT TIME ZONE 'UTC') + INTERVAL '1 month' > statement_timestamp() AT TIME ZONE 'UTC'
      ORDER BY creado_en DESC,id DESC LIMIT 1000`, [member.conferenceId, member.committeeId]);
    return result.rows.filter(row => canRead(member, row)).map(row => JSON.parse(row.contenido));
  }
  function register(socket, on) {
    on('luax-join', async (body, actor) => {
      const cid = id(body?.comiteId);
      requireScope(actor, actor.conferenceId, cid, roles);
      const row = (await db.query('SELECT private_state,estado_debate,debate_revision FROM comites WHERE id=$1 AND conferencia_id=$2', [cid, actor.conferenceId])).rows[0];
      if (!row) throw httpError(404, 'Comité no disponible');
      if (!socket.connected || !sessions.get(socket.handshake.auth.token)) throw httpError(401, 'Sesión no disponible');
      if (members.has(socket.id) && members.get(socket.id).committeeId !== cid) throw httpError(409, 'Debe desconectarse antes de cambiar de comité');
      if (actor.role === 'chair' && writers.has(cid) && writers.get(cid) !== socket.id) throw httpError(409, 'Ya hay una Mesa emitiendo');
      if (actor.role === 'chair') writers.set(cid, socket.id);
      const member = { ...actor, token: socket.handshake.auth.token, country: countries.get(actor.userId) || null };
      members.set(socket.id, member);
      await socket.join(room(cid));
      const state = publicState(row.estado_debate?.state || row.estado_debate || {});
      emit(cid, 'PEER_LIST_UPDATED', peers(cid));
      return { revision: Number(row.debate_revision), role: member.role, country: member.country,
        sessionState: actor.role === 'chair' ? chairState(row.private_state, state) : state,
        roomSettings: state.roomSettings, speakingRequests: state.speakingRequests || [],
        connectedPeers: peers(cid), notes: await history(member), announcements: await announcements(member) };
    });

    on('luax-snapshot', async (body, actor) => {
      const m = members.get(socket.id);
      if (!m || writers.get(m.committeeId) !== socket.id || actor.role !== 'chair') throw httpError(403, 'Mesa no autorizada');
      if (!Number.isSafeInteger(body?.revision) || body.revision < 1) throw httpError(400, 'Revisión inválida');
      const state = publicState(body.state);
      return persistence.enqueue(m.committeeId, { conference: actor.conferenceId, revision: body.revision,
        snapshot: { version: 2, state }, publish: () => {
          socket.to(room(m.committeeId)).emit('luax-state', { revision: body.revision, state });
        } });
    });

    on('luax-command', async (body, actor) => {
      const m = members.get(socket.id);
      if (!m || !roles.includes(actor.role)) throw httpError(403, 'Debe entrar al comité');
      const type = body?.type;
      const payload = privateState({ value: body?.payload || {} }).value;
      const cid = m.committeeId;
      const privileged = ['chair', 'secretariat'].includes(m.role);
      const loadState = async () => {
        const row = (await db.query('SELECT estado_debate,debate_revision FROM comites WHERE id=$1 AND conferencia_id=$2', [cid, actor.conferenceId])).rows[0];
        if (!row) throw httpError(404, 'Comité no disponible');
        return publicState(row.estado_debate?.state || row.estado_debate || {});
      };
      if (type === 'REQUEST_FULL_SYNC') {
        socket.emit('luax-message', { type: 'SYNC_STATE', payload: await loadState() });
        return;
      }
      if (type === 'SELECT_COUNTRY' || type === 'RELEASE_COUNTRY') {
        if (m.role !== 'delegate') throw httpError(403, 'Rol inválido');
        const state = await loadState();
        const selected = type === 'SELECT_COUNTRY' ? state.paises?.find(p => normalize(p.nombre) === normalize(payload.country))?.nombre : null;
        if (type === 'SELECT_COUNTRY' && !selected) throw httpError(400, 'Delegación inválida');
        if (selected && [...members.values()].some(other => other.committeeId === cid && other.userId !== m.userId && normalize(other.country) === normalize(selected))) {
          throw httpError(409, 'Delegación ocupada');
        }
        m.country = selected;
        if (selected) {
          if (countries.size >= 10_000 && !countries.has(m.userId)) countries.delete(countries.keys().next().value);
          countries.set(m.userId, selected);
        } else {
          countries.delete(m.userId);
        }
        socket.emit('luax-message', { type: 'SELECT_COUNTRY_RESULT', payload: { success: true, country: selected, notes: await history(m) } });
        emit(cid, 'PEER_LIST_UPDATED', peers(cid));
        return;
      }
      if (type === 'SEND_NOTE') {
        const content = field(payload.text, 8000);
        const target = field(payload.to, 64);
        const all = ['TODOS', 'ALL'].includes(target.toUpperCase());
        const targetRole = symbolicRoles[target.toUpperCase()] || 'delegate';
        if (m.role === 'delegate' && (!m.country || all)) throw httpError(403, 'Seleccione una delegación y un destinatario');
        const state = await loadState();
        if (m.role === 'delegate' && (targetRole === 'chair'
          ? state.roomSettings?.allowChairNotes === false
          : targetRole !== 'backroom' && state.roomSettings?.allowDelegateNotes === false)) {
          throw httpError(403, 'Notas desactivadas');
        }
        if (!all && targetRole === 'delegate' && !state.paises?.some(p => normalize(p.nombre) === normalize(target))) throw httpError(400, 'Destinatario inválido');
        const clientId = field(payload.id || randomUUID(), 128);
        const note = { id: clientId, from: m.country || m.role.toUpperCase(), fromRole: m.role, to: target,
          text: content, type: field(payload.type || 'general', 64), timestamp: Date.now() };
        const status = m.role === 'delegate' && state.roomSettings?.requireStaffNoteApproval !== false ? 'pending_approval' : 'delivered';
        const result = await db.query(`INSERT INTO mensajes(conferencia_id,comite_id,emisor_rol,emisor_id,destino_tipo,
          destino_rol,destino_id,contenido,estado,client_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (comite_id,emisor_rol,emisor_id,client_id) WHERE client_id IS NOT NULL
          DO UPDATE SET client_id=EXCLUDED.client_id RETURNING *`,
        [actor.conferenceId, cid, m.role, m.userId, all ? 'all' : symbolicRoles[target.toUpperCase()] ? 'role' : 'direct',
          all ? null : targetRole, targetRole === 'delegate' && !all ? normalize(target) : null, JSON.stringify(note), status, clientId]);
        publishNote(result.rows[0]);
        return { note: noteView(result.rows[0]) };
      }
      if (type === 'REVIEW_NOTE') {
        if (m.role !== 'staff' || !['approved', 'rejected'].includes(payload.status)) throw httpError(403, 'Decisión inválida');
        const messageId = field(payload.mensajeId, 19);
        if (!/^[1-9][0-9]{0,18}$/.test(messageId) || BigInt(messageId) > 9223372036854775807n) throw httpError(400, 'Mensaje inválido');
        const result = await db.query(`UPDATE mensajes SET estado=$4 WHERE conferencia_id=$1 AND comite_id=$2
          AND id=$3 AND estado='pending_approval' AND tipo_aviso IS NULL RETURNING *`,
        [actor.conferenceId, cid, messageId, payload.status === 'approved' ? 'delivered' : 'rejected']);
        if (result.rows.length !== 1) throw httpError(409, 'Nota no disponible');
        publishNote(result.rows[0]);
        socket.emit('luax-message', { type: 'NOTE_RECEIVED', payload: noteView(result.rows[0]) });
        return;
      }
      if (type === 'KICK_PEER') {
        if (!privileged) throw httpError(403, 'Acceso denegado');
        const target = members.get(payload.peerId);
        if (!target || target.committeeId !== cid || target.role === 'chair') throw httpError(403, 'Destinatario inválido');
        countries.delete(target.userId);
        sessions.revoke(entry => entry.userId === target.userId && entry.committeeId === cid);
        io.sockets.sockets.get(payload.peerId)?.disconnect(true);
        return;
      }
      if (type === 'BROADCAST_ANNOUNCEMENT' || type === 'DELETE_ANNOUNCEMENT') {
        if (!['chair', 'secretariat', 'staff'].includes(m.role)) throw httpError(403, 'Acceso denegado');
        let row;
        if (type === 'BROADCAST_ANNOUNCEMENT') {
          const target = field(payload.target || 'ALL', 64).toUpperCase();
          const targetRole = symbolicRoles[target];
          if (!['ALL', 'TODOS'].includes(target) && !targetRole) throw httpError(400, 'Destinatario inválido');
          const announcement = { id: field(payload.id || randomUUID(), 128), title: field(payload.title || 'Aviso', 255),
            text: field(payload.text, 8000), priority: field(payload.priority || 'general', 32), target,
            senderRole: m.role, senderName: m.role, timestamp: Date.now() };
          row = (await db.query(`INSERT INTO mensajes(conferencia_id,comite_id,emisor_rol,emisor_id,destino_tipo,
            destino_rol,contenido,tipo_aviso,client_id) VALUES($1,$2,$3,$4,$5,$6,$7,'room_announcement',$8)
            ON CONFLICT (comite_id,emisor_rol,emisor_id,client_id) WHERE client_id IS NOT NULL
            DO UPDATE SET client_id=EXCLUDED.client_id RETURNING *`,
          [actor.conferenceId, cid, m.role, m.userId, targetRole ? 'role' : 'all', targetRole || null, JSON.stringify(announcement), announcement.id])).rows[0];
        } else {
          row = (await db.query(`UPDATE mensajes SET estado='archived' WHERE conferencia_id=$1 AND comite_id=$2
            AND client_id=$3 AND tipo_aviso='room_announcement' AND estado='delivered'
            AND ($4='chair' OR (emisor_rol=$4 AND emisor_id=$5)) RETURNING *`,
          [actor.conferenceId, cid, field(payload.id, 128), m.role, m.userId])).rows[0];
          if (!row) throw httpError(404, 'Aviso no disponible');
        }
        for (const [sid, member] of members) {
          if (sessions.get(member.token) && canRead(member, { ...row, estado: 'delivered' })) {
            io.to(sid).emit('luax-message', { type, payload: type === 'DELETE_ANNOUNCEMENT' ? { id: row.client_id } : JSON.parse(row.contenido) });
          }
        }
        return;
      }
      const chairOutputs = ['SPEAKING_PROCESSED','SPEAKING_REQUESTS_UPDATED','ROOM_SETTINGS_UPDATED','CRISIS_ALERT','AMENDMENTS_PROPOSALS_UPDATED'];
      if (chairOutputs.includes(type)) {
        if (writers.get(cid) !== socket.id) throw httpError(403, 'Acceso denegado');
        if (body.targetSocketId) {
          if (members.get(body.targetSocketId)?.committeeId !== cid) throw httpError(403, 'Destinatario inválido');
          io.to(body.targetSocketId).emit('luax-message', { type, payload });
        } else emit(cid, type, payload);
        return;
      }
      if (['SESSION_ACTION','UPDATE_ROOM_SETTINGS','PROCESS_SPEAKING_REQUEST'].includes(type)) {
        if (!privileged || (type === 'SESSION_ACTION' && !actions.has(payload.action))) throw httpError(403, 'Acción no permitida');
      } else if (['CAST_VOTE','REQUEST_SPEAKING','SUBMIT_AMENDMENT'].includes(type)) {
        if (m.role !== 'delegate' || !m.country) throw httpError(403, 'Delegación no asignada');
        const state = await loadState();
        if (type === 'CAST_VOTE' && (state.roomSettings?.allowLiveVoting === false || !['favor','contra','abstencion','pasar','favor_derechos','contra_derechos'].includes(payload.vote))) throw httpError(400, 'Voto inválido');
        if (type === 'REQUEST_SPEAKING' && !['GSL','CAUCUS','MOTION','POINT_MOTION','POINT'].includes(payload.speechType)) throw httpError(400, 'Solicitud inválida');
        payload.country = m.country;
        if (payload.details) payload.details.country = m.country;
        payload.paisProponente = m.country;
        payload.timestamp = Date.now();
        payload.id = randomUUID();
      } else throw httpError(400, 'Evento no permitido');
      const writer = writers.get(cid);
      if (!writer) throw httpError(409, 'La Mesa no está conectada');
      io.to(writer).emit('luax-command', { type, payload, senderSocketId: socket.id, senderMeta: {
        role: m.role, country: m.country, clientId: m.userId, socketId: socket.id
      } });
    });
    socket.on('disconnect', () => {
      const member = members.get(socket.id);
      if (!member) return;
      members.delete(socket.id);
      if (writers.get(member.committeeId) === socket.id) writers.delete(member.committeeId);
      emit(member.committeeId, 'PEER_LIST_UPDATED', peers(member.committeeId));
    });
  }
  return register;
}

module.exports = { createRelay };
